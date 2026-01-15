import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CadastroRapidoDialog, SupplierProductData } from "@/components/CadastroRapidoDialog";
import { VincularEanDialog } from "@/components/VincularEanDialog";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ScanLine,
  Package,
  Check,
  ArrowRight,
  History,
  AlertCircle,
  Plus,
  Minus,
  Keyboard,
  Camera,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Link2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  X,
  Truck,
  Smartphone,
} from "lucide-react";
import { useSearchByEan, useConfirmarEntrada, useMovimentacoesRecentes, useVerificarAtualizacaoCusto } from "@/hooks/useReceberMercadoria";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HistoryEntry {
  id: string;
  nome: string;
  ean: string;
  quantidade: number;
  timestamp: Date;
  fromSupplier?: boolean;
}

export default function EntradaEstoque() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { feedback } = useScannerFeedback();

  // Mode: auto-detect based on URL param or device
  const defaultQuickMode = searchParams.get("mode") === "quick" || isMobile;
  
  // States
  const [scannerOpen, setScannerOpen] = useState(defaultQuickMode);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [notas, setNotas] = useState("");
  const [precoVenda, setPrecoVenda] = useState<number | null>(null);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manterPrecoAntigo, setManterPrecoAntigo] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Dialog states
  const [cadastroDialogOpen, setCadastroDialogOpen] = useState(false);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);
  const [supplierData, setSupplierData] = useState<SupplierProductData | null>(null);
  
  // History (session-based)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const activeCode = mode === "scan" ? scannedCode : manualCode;
  const { data: searchResult, isLoading: isSearching } = useSearchByEan(activeCode);
  const { mutate: confirmarEntrada, isPending: isConfirming } = useConfirmarEntrada();
  const { data: movimentacoes } = useMovimentacoesRecentes(5);

  // Check for cost updates when equipment is found
  const equipamentoId = searchResult?.source === "equipamento" ? searchResult.equipamento?.id : null;
  const equipamentoEan = searchResult?.equipamento?.ean || activeCode;
  const { data: atualizacaoCusto } = useVerificarAtualizacaoCusto(
    equipamentoId || null,
    equipamentoEan || null
  );

  // Auto-expand details when cost update detected
  useEffect(() => {
    if (atualizacaoCusto) {
      setDetailsOpen(true);
    }
  }, [atualizacaoCusto]);

  // Provide feedback when search result changes
  useEffect(() => {
    if (!isSearching && activeCode && soundEnabled) {
      if (searchResult?.found) {
        if (atualizacaoCusto) {
          feedback('warning');
        } else {
          feedback('success');
        }
      } else if (searchResult !== undefined) {
        feedback('error');
      }
    }
  }, [searchResult, isSearching, activeCode, atualizacaoCusto, soundEnabled, feedback]);

  // Handle scan from BarcodeScanner
  const handleScan = useCallback((code: string) => {
    setScannedCode(code);
    setQuantidade(1);
    setNotas("");
    setPrecoVenda(null);
    setManterPrecoAntigo(false);
    setDetailsOpen(false);
    setScannerOpen(false);
  }, []);

  // Handle confirming entry
  const handleConfirmarEntrada = () => {
    if (!searchResult?.found) return;

    if (searchResult.source === "supplier" && searchResult.supplierProduct) {
      confirmarEntrada({
        source: "supplier",
        supplierId: searchResult.supplierProduct.id,
        quantidade,
        notas,
        supplierProduct: searchResult.supplierProduct,
        precoVenda: precoVenda || searchResult.supplierProduct.cost_price * 1.4,
      }, {
        onSuccess: () => {
          if (soundEnabled) feedback('confirm');
          addToHistory(searchResult.supplierProduct!.product_name, activeCode || "", true);
          toast.success(`+${quantidade} entrada confirmada`);
          resetState();
        },
        onError: () => {
          if (soundEnabled) feedback('error');
          toast.error("Erro ao confirmar entrada");
        },
      });
    } else if (searchResult.source === "equipamento" && searchResult.equipamento) {
      confirmarEntrada({
        source: "equipamento",
        equipamentoId: searchResult.equipamento.id,
        quantidade,
        notas,
        atualizarCusto: atualizacaoCusto && !manterPrecoAntigo ? {
          custoNovo: atualizacaoCusto.custoNovo,
          precoVendaNovo: atualizacaoCusto.precoVendaNovo,
        } : undefined,
      }, {
        onSuccess: () => {
          if (soundEnabled) feedback('confirm');
          addToHistory(searchResult.equipamento!.nome, activeCode || "", false);
          toast.success(`+${quantidade} entrada confirmada`);
          resetState();
        },
        onError: () => {
          if (soundEnabled) feedback('error');
          toast.error("Erro ao confirmar entrada");
        },
      });
    }
  };

  const addToHistory = (nome: string, ean: string, fromSupplier: boolean) => {
    setHistory(prev => [{
      id: `${Date.now()}`,
      nome,
      ean,
      quantidade,
      timestamp: new Date(),
      fromSupplier,
    }, ...prev].slice(0, 10));
  };

  const resetState = () => {
    setScannedCode(null);
    setManualCode("");
    setQuantidade(1);
    setNotas("");
    setPrecoVenda(null);
    setManterPrecoAntigo(false);
    setDetailsOpen(false);
    setSupplierData(null);
    // Auto-reopen scanner on mobile
    if (isMobile) {
      setScannerOpen(true);
    }
  };

  const handleManualSearch = () => {
    if (manualCode.length >= 3) {
      setManualCode(manualCode.trim());
    }
  };

  // Open cadastro with supplier data if available
  const handleOpenCadastro = () => {
    if (searchResult?.source === "supplier" && searchResult.supplierProduct) {
      const sp = searchResult.supplierProduct;
      setSupplierData({
        product_name: sp.product_name,
        category: sp.category,
        brand: sp.brand,
        size: sp.size,
        cost_price: sp.cost_price,
        sku: sp.sku,
      });
    } else {
      setSupplierData(null);
    }
    setCadastroDialogOpen(true);
  };

  const handleCadastroSuccess = () => {
    if (soundEnabled) feedback('confirm');
    addToHistory(supplierData?.product_name || "Novo produto", activeCode || "", !!supplierData);
    toast.success("Produto cadastrado com sucesso!");
    setCadastroDialogOpen(false);
    resetState();
  };

  const productData = searchResult?.source === "supplier" 
    ? searchResult.supplierProduct 
    : searchResult?.equipamento;

  const suggestedPrice = searchResult?.supplierProduct 
    ? Math.round(searchResult.supplierProduct.cost_price * 1.4)
    : null;

  // Mobile Full-Screen Scanner Mode
  if (scannerOpen && isMobile) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setScannerOpen(false);
              if (!scannedCode) navigate("/estoque");
            }}
            className="text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="text-white font-medium">Entrada de Estoque</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn("text-white hover:bg-white/10", !soundEnabled && "opacity-50")}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
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
                    {entry.fromSupplier && <Truck className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                    <span className="truncate">{entry.nome}</span>
                  </div>
                  <Badge variant="secondary" className="ml-2">+{entry.quantidade}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scanner */}
        <div className="flex-1 relative">
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setScannerOpen(false)}
            isSearching={isSearching}
          />
        </div>

        {/* Manual Input Toggle (Mobile) */}
        <div className="p-4 bg-black/80 backdrop-blur-sm">
          <Button
            variant="outline"
            className="w-full h-12 border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              setScannerOpen(false);
              setMode("manual");
            }}
          >
            <Keyboard className="h-5 w-5 mr-2" />
            Digitar código manualmente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Entrada de Estoque"
        description="Dê entrada em produtos via câmera ou código manual"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(!soundEnabled && "opacity-50")}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="relative"
            title="Histórico da sessão"
          >
            <History className="h-5 w-5" />
            {history.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {history.length}
              </Badge>
            )}
          </Button>
        </div>
      </PageHeader>
      
      <EstoqueSubmenu className="mb-6" />

      {/* Session History */}
      {showHistory && history.length > 0 && (
        <PremiumCard className="p-4 mb-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Entradas desta sessão
          </h3>
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div key={`${entry.id}-${idx}`} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 truncate flex-1">
                  {entry.fromSupplier && <Truck className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  <span className="truncate">{entry.nome}</span>
                  <span className="text-xs text-muted-foreground font-mono">{entry.ean}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">+{entry.quantidade}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Section */}
        <PremiumCard className="p-6">
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={mode === "scan" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setMode("scan")}
              >
                <Camera className="h-4 w-4" />
                Câmera
              </Button>
              <Button
                variant={mode === "manual" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setMode("manual")}
              >
                <Keyboard className="h-4 w-4" />
                Manual
              </Button>
            </div>

            {mode === "scan" ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <ScanLine className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Scanner de Código de Barras</h3>
                  <p className="text-sm text-muted-foreground">
                    Use a câmera para ler o código EAN/UPC do produto
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => setScannerOpen(true)}
                >
                  <Camera className="h-5 w-5" />
                  Abrir Câmera
                </Button>
                {scannedCode && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Último código escaneado:</p>
                    <p className="font-mono font-bold text-lg">{scannedCode}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="manual-code">Código EAN/SKU</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="manual-code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Digite o código do produto"
                      className="font-mono text-base"
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    />
                    <Button onClick={handleManualSearch} disabled={manualCode.length < 3 || isSearching}>
                      {isSearching ? "..." : "Buscar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PremiumCard>

        {/* Product Card / Result */}
        <PremiumCard className="p-6">
          {isSearching ? (
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Buscando produto...</p>
              </div>
            </div>
          ) : searchResult?.found && productData ? (
            <div className="space-y-6">
              {/* Product Found Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-green-600">Produto encontrado</span>
                    <Badge variant={searchResult.source === "supplier" ? "secondary" : "default"}>
                      {searchResult.source === "supplier" ? "Catálogo Duotone" : "Estoque próprio"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold mt-1">
                    {"product_name" in productData ? productData.product_name : productData.nome}
                  </h3>
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Categoria:</span>
                  <p className="font-medium">
                    {"category" in productData ? productData.category : productData.tipo}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tamanho:</span>
                  <p className="font-medium">
                    {("size" in productData ? productData.size : productData.tamanho) || "N/A"}
                  </p>
                </div>
                {"brand" in productData && productData.brand && (
                  <div>
                    <span className="text-muted-foreground">Marca:</span>
                    <p className="font-medium">{productData.brand}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Preço Custo:</span>
                  <p className="font-medium">
                    R$ {(searchResult?.supplierProduct?.cost_price || searchResult?.equipamento?.cost_price || 0).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Cost Update Alert */}
              {searchResult.source === "equipamento" && atualizacaoCusto && (
                <div className="p-4 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">
                          Preço de Custo Atualizado!
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          O fornecedor alterou o preço deste produto
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Custo:</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="line-through text-muted-foreground">
                              R$ {atualizacaoCusto.custoAntigo.toLocaleString("pt-BR")}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-bold text-foreground">
                              R$ {atualizacaoCusto.custoNovo.toLocaleString("pt-BR")}
                            </span>
                            <Badge 
                              variant={atualizacaoCusto.percentualVariacao > 0 ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {atualizacaoCusto.percentualVariacao > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {atualizacaoCusto.percentualVariacao > 0 ? "+" : ""}{atualizacaoCusto.percentualVariacao.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Venda sugerida:</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="line-through text-muted-foreground">
                              R$ {atualizacaoCusto.precoVendaAntigo.toLocaleString("pt-BR")}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-bold text-foreground">
                              R$ {atualizacaoCusto.precoVendaNovo.toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-yellow-500/30">
                        <Checkbox 
                          id="manter-preco"
                          checked={manterPrecoAntigo}
                          onCheckedChange={(checked) => setManterPrecoAntigo(!!checked)}
                        />
                        <label htmlFor="manter-preco" className="text-sm cursor-pointer">
                          Manter preço de venda antigo (R$ {atualizacaoCusto.precoVendaAntigo.toLocaleString("pt-BR")})
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    disabled={quantidade <= 1}
                    className="h-12 w-12"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{quantidade}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidade(quantidade + 1)}
                    className="h-12 w-12"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Collapsible Details */}
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="text-sm">Detalhes adicionais</span>
                    {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Price Input (for supplier products) */}
                  {searchResult.source === "supplier" && suggestedPrice && (
                    <div>
                      <Label htmlFor="preco-venda">Preço de Venda</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-muted-foreground">R$</span>
                        <Input
                          id="preco-venda"
                          type="number"
                          value={precoVenda ?? suggestedPrice}
                          onChange={(e) => setPrecoVenda(Number(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-xs text-muted-foreground">
                          (sugerido: +40% = R$ {suggestedPrice.toLocaleString("pt-BR")})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notas">Observações (opcional)</Label>
                    <Textarea
                      id="notas"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Nota fiscal, condições do produto..."
                      rows={2}
                      className="mt-1.5"
                    />
                  </div>

                  {/* Link EAN Button */}
                  {searchResult.source === "equipamento" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVincularDialogOpen(true)}
                      className="gap-2"
                    >
                      <Link2 className="h-4 w-4" />
                      Vincular outro EAN a este produto
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Confirm Button */}
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleConfirmarEntrada}
                disabled={isConfirming}
              >
                <ArrowRight className="h-5 w-5" />
                {isConfirming ? "Confirmando..." : `Confirmar Entrada (+${quantidade})`}
              </Button>
            </div>
          ) : activeCode && !isSearching ? (
            /* Not Found State */
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Produto não encontrado</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">{activeCode}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleOpenCadastro} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Cadastrar Novo Produto
                  </Button>
                  <Button variant="outline" onClick={() => setVincularDialogOpen(true)} className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Vincular a Produto Existente
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-2">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Escaneie ou digite um código para começar
                </p>
              </div>
            </div>
          )}
        </PremiumCard>
      </div>

      {/* Recent Movements from DB */}
      {movimentacoes && movimentacoes.length > 0 && (
        <PremiumCard className="p-6 mt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            Últimas Movimentações (Sistema)
          </h3>
          <div className="space-y-3">
            {movimentacoes.map((mov: any) => (
              <div key={mov.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  {mov.tipo === "entrada" ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Minus className="h-3 w-3 text-red-600" />
                    </div>
                  )}
                  <span>{mov.equipamentos?.nome || "Produto"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={mov.tipo === "entrada" ? "default" : "secondary"}>
                    {mov.tipo === "entrada" ? "+" : "-"}{mov.quantidade}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(mov.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}

      {/* Scanner Dialog for Desktop */}
      <Dialog open={scannerOpen && !isMobile} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogTitle className="sr-only">Scanner de Código de Barras</DialogTitle>
          <DialogDescription className="sr-only">Use a câmera para escanear o código de barras do produto</DialogDescription>
          <div className="h-[400px]">
            <BarcodeScanner
              onScan={handleScan}
              onClose={() => setScannerOpen(false)}
              isSearching={isSearching}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Cadastro Dialog */}
      <CadastroRapidoDialog
        open={cadastroDialogOpen}
        onOpenChange={setCadastroDialogOpen}
        ean={activeCode || ""}
        onSuccess={handleCadastroSuccess}
        supplierData={supplierData}
      />

      {/* Vincular Dialog */}
      <VincularEanDialog
        open={vincularDialogOpen}
        onOpenChange={setVincularDialogOpen}
        ean={activeCode || ""}
        onSuccess={() => {
          setVincularDialogOpen(false);
          toast.success("EAN vinculado com sucesso!");
        }}
      />
    </>
  );
}
