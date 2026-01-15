import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Keyboard, History, Package, Plus, Minus, Check, X, Smartphone, Volume2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CadastroRapidoDialog, SupplierProductData } from "@/components/CadastroRapidoDialog";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";
import { useSearchByEan } from "@/hooks/useReceberMercadoria";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ScannedProduct {
  id: string;
  nome: string;
  ean: string;
  quantidade_fisica: number;
  tipo: string;
  tamanho?: string;
}

interface HistoryEntry {
  id: string;
  nome: string;
  ean: string;
  quantidade: number;
  timestamp: Date;
  fromSupplier?: boolean;
}

export default function ScannerMobile() {
  const navigate = useNavigate();
  const { feedback } = useScannerFeedback();
  
  const [isScanning, setIsScanning] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualEan, setManualEan] = useState("");
  const [currentEan, setCurrentEan] = useState<string | null>(null);
  
  const [foundProduct, setFoundProduct] = useState<ScannedProduct | null>(null);
  const [quantidadeEntrada, setQuantidadeEntrada] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [showCadastro, setShowCadastro] = useState(false);
  const [unknownEan, setUnknownEan] = useState<string | null>(null);
  const [supplierData, setSupplierData] = useState<SupplierProductData | null>(null);
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Use the hook for searching
  const { data: searchResult, isLoading: isSearching } = useSearchByEan(currentEan);

  // Process search result
  const processSearchResult = useCallback((ean: string) => {
    if (!searchResult) return;

    if (searchResult.found && searchResult.source === "equipamento" && searchResult.equipamento) {
      // Product found in local inventory
      if (soundEnabled) feedback('success');
      setFoundProduct({
        id: searchResult.equipamento.id,
        nome: searchResult.equipamento.nome,
        ean: searchResult.equipamento.ean || "",
        quantidade_fisica: searchResult.equipamento.quantidade_fisica || 0,
        tipo: searchResult.equipamento.tipo,
        tamanho: searchResult.equipamento.tamanho || undefined,
      });
      setQuantidadeEntrada(1);
      setIsScanning(false);
    } else if (searchResult.found && searchResult.source === "supplier" && searchResult.supplierProduct) {
      // Found in Duotone catalog - pre-fill registration
      if (soundEnabled) feedback('success');
      const sp = searchResult.supplierProduct;
      setSupplierData({
        product_name: sp.product_name,
        category: sp.category,
        brand: sp.brand,
        size: sp.size,
        cost_price: sp.cost_price,
        sku: sp.sku,
      });
      setUnknownEan(ean);
      setShowCadastro(true);
      setIsScanning(false);
      toast.info("Produto encontrado no catálogo Duotone", {
        description: "Dados pré-preenchidos para cadastro rápido",
      });
    } else {
      // Not found anywhere
      if (soundEnabled) feedback('error');
      setSupplierData(null);
      setUnknownEan(ean);
      setShowCadastro(true);
      setIsScanning(false);
    }
  }, [searchResult, soundEnabled, feedback]);

  // Search product by EAN
  const searchProduct = useCallback((ean: string) => {
    setCurrentEan(ean);
  }, []);

  // Effect to process search results when they arrive
  const handleSearchComplete = useCallback(() => {
    if (currentEan && searchResult !== undefined && !isSearching) {
      processSearchResult(currentEan);
      setCurrentEan(null);
    }
  }, [currentEan, searchResult, isSearching, processSearchResult]);

  // Trigger processing when search completes
  if (currentEan && searchResult !== undefined && !isSearching) {
    handleSearchComplete();
  }

  // Handle barcode scan
  const handleScan = useCallback((code: string) => {
    if (!code || isSearching || currentEan) return;
    searchProduct(code);
  }, [searchProduct, isSearching, currentEan]);

  // Handle manual EAN submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEan.trim() && !isSearching) {
      searchProduct(manualEan.trim());
      setManualEan("");
      setShowManualInput(false);
    }
  };

  // Confirm stock entry
  const handleConfirmEntry = async () => {
    if (!foundProduct || quantidadeEntrada < 1) return;
    
    setIsConfirming(true);
    
    try {
      // Update stock
      const novaQuantidade = (foundProduct.quantidade_fisica || 0) + quantidadeEntrada;
      
      const { error: updateError } = await supabase
        .from("equipamentos")
        .update({ quantidade_fisica: novaQuantidade })
        .eq("id", foundProduct.id);

      if (updateError) throw updateError;

      // Register movement
      await supabase.from("movimentacoes_estoque").insert({
        equipamento_id: foundProduct.id,
        tipo: "entrada",
        quantidade: quantidadeEntrada,
        origem: "scanner_mobile",
        notas: `Entrada via Scanner Mobile`,
      });

      // Add to history
      setHistory(prev => [{
        id: foundProduct.id,
        nome: foundProduct.nome,
        ean: foundProduct.ean || "",
        quantidade: quantidadeEntrada,
        timestamp: new Date(),
      }, ...prev].slice(0, 10));

      if (soundEnabled) feedback('confirm');
      toast.success(`+${quantidadeEntrada} ${foundProduct.nome}`);
      
      // Reset and continue scanning
      setFoundProduct(null);
      setQuantidadeEntrada(1);
      setIsScanning(true);
      
    } catch (err) {
      console.error("Erro ao confirmar entrada:", err);
      if (soundEnabled) feedback('error');
      toast.error("Erro ao confirmar entrada");
    } finally {
      setIsConfirming(false);
    }
  };

  // Cancel current operation
  const handleCancel = () => {
    setFoundProduct(null);
    setUnknownEan(null);
    setShowCadastro(false);
    setSupplierData(null);
    setQuantidadeEntrada(1);
    setIsScanning(true);
    setCurrentEan(null);
  };

  // Handle successful product registration
  const handleCadastroSuccess = () => {
    // Add to history with supplier indicator
    if (unknownEan) {
      setHistory(prev => [{
        id: `new-${Date.now()}`,
        nome: supplierData?.product_name || "Novo produto",
        ean: unknownEan,
        quantidade: 1,
        timestamp: new Date(),
        fromSupplier: !!supplierData,
      }, ...prev].slice(0, 10));
    }
    
    setShowCadastro(false);
    setUnknownEan(null);
    setSupplierData(null);
    if (soundEnabled) feedback('confirm');
    toast.success("Produto cadastrado e entrada registrada!");
    setIsScanning(true);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/estoque")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <span className="text-white font-medium">Scanner Mobile</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "text-white hover:bg-white/10",
              !soundEnabled && "opacity-50"
            )}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="text-white hover:bg-white/10 relative"
          >
            <History className="h-5 w-5" />
            {history.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {history.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="bg-card/95 backdrop-blur-sm border-b border-border max-h-48 overflow-y-auto">
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Últimas entradas</p>
            {history.map((entry, idx) => (
              <div key={`${entry.id}-${idx}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 truncate flex-1">
                  {entry.fromSupplier && (
                    <Truck className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{entry.nome}</span>
                </div>
                <Badge variant="secondary" className="ml-2">+{entry.quantidade}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scanner Area */}
      <div className="flex-1 relative">
        {isScanning ? (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => navigate("/estoque")}
            isSearching={isSearching}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60 flex items-center justify-center p-4">
            {/* Product Found Card */}
            {foundProduct && (
              <div className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{foundProduct.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {foundProduct.tipo} {foundProduct.tamanho && `• ${foundProduct.tamanho}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estoque atual: <span className="font-medium text-foreground">{foundProduct.quantidade_fisica || 0}</span>
                    </p>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidadeEntrada(Math.max(1, quantidadeEntrada - 1))}
                    className="h-12 w-12 rounded-full"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  
                  <div className="text-center">
                    <span className="text-4xl font-bold text-primary">+{quantidadeEntrada}</span>
                    <p className="text-xs text-muted-foreground mt-1">unidades</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidadeEntrada(quantidadeEntrada + 1)}
                    className="h-12 w-12 rounded-full"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={handleConfirmEntry}
                    disabled={isConfirming}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isConfirming ? "Salvando..." : "Confirmar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Input Toggle */}
      {isScanning && (
        <div className="p-4 bg-black/80 backdrop-blur-sm">
          {showManualInput ? (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Digite o código EAN..."
                value={manualEan}
                onChange={(e) => setManualEan(e.target.value)}
                className="flex-1 h-12 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
                autoFocus
              />
              <Button type="submit" className="h-12 px-6" disabled={isSearching}>
                {isSearching ? "..." : "Buscar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 text-white"
                onClick={() => setShowManualInput(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 border-white/20 text-white hover:bg-white/10"
              onClick={() => setShowManualInput(true)}
            >
              <Keyboard className="h-5 w-5 mr-2" />
              Digitar código manualmente
            </Button>
          )}
        </div>
      )}

      {/* Cadastro Dialog with Supplier Data */}
      <CadastroRapidoDialog
        open={showCadastro}
        onOpenChange={setShowCadastro}
        ean={unknownEan || ""}
        onSuccess={handleCadastroSuccess}
        supplierData={supplierData}
      />
    </div>
  );
}
