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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowDown,
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
  PackageMinus,
} from "lucide-react";
import { 
  useSearchByEan, 
  useConfirmarEntrada, 
  useMovimentacoesRecentes, 
  useVerificarAtualizacaoCusto,
  useConfirmarSaida,
  useSearchEquipamentoByEan,
} from "@/hooks/useReceberMercadoria";
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
  tipo: "entrada" | "saida";
}

type OperationType = "entrada" | "saida";

const MOTIVOS_SAIDA = [
  { value: "venda", label: "Venda Presencial" },
  { value: "defeito", label: "Defeito / Avaria" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "perda", label: "Perda / Extravio" },
  { value: "outro", label: "Outro" },
];

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
  
  // Operation type: entrada or saida
  const [operationType, setOperationType] = useState<OperationType>("entrada");
  const [motivoSaida, setMotivoSaida] = useState<string>("");
  
  // Dialog states
  const [cadastroDialogOpen, setCadastroDialogOpen] = useState(false);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);
  const [supplierData, setSupplierData] = useState<SupplierProductData | null>(null);
  
  // History (session-based)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const activeCode = mode === "scan" ? scannedCode : manualCode;
  
  // Use different search hooks based on operation type
  const { data: searchResult, isLoading: isSearchingEntrada } = useSearchByEan(
    operationType === "entrada" ? activeCode : null
  );
  const { data: equipamentoSaida, isLoading: isSearchingSaida } = useSearchEquipamentoByEan(
    operationType === "saida" ? activeCode : null
  );
  
  const isSearching = operationType === "entrada" ? isSearchingEntrada : isSearchingSaida;
  
  const { mutate: confirmarEntrada, isPending: isConfirmingEntrada } = useConfirmarEntrada();
  const { mutate: confirmarSaida, isPending: isConfirmingSaida } = useConfirmarSaida();
  const isConfirming = operationType === "entrada" ? isConfirmingEntrada : isConfirmingSaida;
  
  const { data: movimentacoes } = useMovimentacoesRecentes(5);

  // Check for cost updates when equipment is found (only for entrada)
  const equipamentoId = searchResult?.source === "equipamento" ? searchResult.equipamento?.id : null;
  const equipamentoEan = searchResult?.equipamento?.ean || activeCode;
  const { data: atualizacaoCusto } = useVerificarAtualizacaoCusto(
    operationType === "entrada" ? equipamentoId : null,
    operationType === "entrada" ? equipamentoEan : null
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
    setMotivoSaida("");
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
          addToHistory(searchResult.supplierProduct!.product_name, activeCode || "", true, "entrada");
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
          addToHistory(searchResult.equipamento!.nome, activeCode || "", false, "entrada");
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

  // Handle confirming exit
  const handleConfirmarSaida = () => {
    if (!equipamentoSaida) return;
    
    // Validate stock
    if (quantidade > (equipamentoSaida.quantidade_fisica || 0)) {
      toast.error(`Estoque insuficiente. Disponível: ${equipamentoSaida.quantidade_fisica}`);
      if (soundEnabled) feedback('error');
      return;
    }

    confirmarSaida({
      equipamentoId: equipamentoSaida.id,
      quantidade,
      motivo: motivoSaida,
      notas,
    }, {
      onSuccess: () => {
        if (soundEnabled) feedback('confirm');
        addToHistory(equipamentoSaida.nome, activeCode || "", false, "saida");
        toast.success(`-${quantidade} saída registrada`);
        resetState();
      },
      onError: () => {
        if (soundEnabled) feedback('error');
      },
    });
  };

  const addToHistory = (nome: string, ean: string, fromSupplier: boolean, tipo: OperationType) => {
    setHistory(prev => [{
      id: `${Date.now()}`,
      nome,
      ean,
      quantidade,
      timestamp: new Date(),
      fromSupplier,
      tipo,
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
    setMotivoSaida("");
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
    addToHistory(supplierData?.product_name || "Novo produto", activeCode || "", !!supplierData, "entrada");
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
            {operationType === "entrada" ? (
              <Plus className="h-5 w-5 text-green-500" />
            ) : (
              <Minus className="h-5 w-5 text-red-500" />
            )}
            <span className="text-white font-medium">
              {operationType === "entrada" ? "Entrada de Estoque" : "Saída de Estoque"}
            </span>
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

        {/* Operation Type Toggle (Mobile) */}
        <div className="flex gap-2 p-3 bg-black/60 backdrop-blur-sm">
          <Button
            variant={operationType === "entrada" ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2 h-10",
              operationType === "entrada" && "bg-green-600 hover:bg-green-700 text-white border-green-600"
            )}
            onClick={() => setOperationType("entrada")}
          >
            <Plus className="h-4 w-4" />
            Entrada
          </Button>
          <Button
            variant={operationType === "saida" ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2 h-10",
              operationType === "saida" && "bg-red-600 hover:bg-red-700 text-white border-red-600",
              operationType !== "saida" && "border-white/20 text-white hover:bg-white/10"
            )}
            onClick={() => setOperationType("saida")}
          >
            <Minus className="h-4 w-4" />
            Saída
          </Button>
        </div>

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <div className="bg-card/95 backdrop-blur-sm border-b border-border max-h-48 overflow-y-auto">
            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Últimas movimentações</p>
              {history.map((entry, idx) => (
                <div key={`${entry.id}-${idx}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 truncate flex-1">
                    {entry.fromSupplier && <Truck className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                    <span className="truncate">{entry.nome}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "ml-2",
                      entry.tipo === "entrada" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                    )}
                  >
                    {entry.tipo === "entrada" ? "+" : "-"}{entry.quantidade}
                  </Badge>
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
        title={operationType === "entrada" ? "Entrada de Estoque" : "Saída de Estoque"}
        description={operationType === "entrada" 
          ? "Dê entrada em produtos via câmera ou código manual" 
          : "Registre baixas de produtos do estoque"
        }
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

      {/* Operation Type Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={operationType === "entrada" ? "default" : "outline"}
          className={cn(
            "flex-1 gap-2 h-12",
            operationType === "entrada" && "bg-green-600 hover:bg-green-700 text-white"
          )}
          onClick={() => {
            setOperationType("entrada");
            resetState();
          }}
        >
          <Plus className="h-5 w-5" />
          Entrada
        </Button>
        <Button
          variant={operationType === "saida" ? "default" : "outline"}
          className={cn(
            "flex-1 gap-2 h-12",
            operationType === "saida" && "bg-red-600 hover:bg-red-700 text-white"
          )}
          onClick={() => {
            setOperationType("saida");
            resetState();
          }}
        >
          <Minus className="h-5 w-5" />
          Saída
        </Button>
      </div>

      {/* Session History */}
      {showHistory && history.length > 0 && (
        <PremiumCard className="p-4 mb-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Movimentações desta sessão
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
                  <Badge 
                    variant="secondary"
                    className={cn(
                      entry.tipo === "entrada" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                    )}
                  >
                    {entry.tipo === "entrada" ? "+" : "-"}{entry.quantidade}
                  </Badge>
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
                <div className={cn(
                  "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
                  operationType === "entrada" ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  <ScanLine className={cn(
                    "h-10 w-10",
                    operationType === "entrada" ? "text-green-600" : "text-red-600"
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Scanner de Código de Barras</h3>
                  <p className="text-sm text-muted-foreground">
                    {operationType === "entrada" 
                      ? "Escaneie para dar entrada no produto"
                      : "Escaneie para registrar saída do produto"
                    }
                  </p>
                </div>
                <Button
                  size="lg"
                  className={cn(
                    "w-full gap-2",
                    operationType === "entrada" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-red-600 hover:bg-red-700"
                  )}
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
          ) : operationType === "entrada" && searchResult?.found && productData ? (
            /* ENTRADA MODE - Product Found */
            <div className="space-y-6">
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

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Categoria:</span>
                  <p className="font-medium">{"category" in productData ? productData.category : productData.tipo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tamanho:</span>
                  <p className="font-medium">{("size" in productData ? productData.size : productData.tamanho) || "N/A"}</p>
                </div>
              </div>

              {searchResult.source === "equipamento" && atualizacaoCusto && (
                <div className="p-4 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">Custo Atualizado!</h4>
                      <p className="text-sm">R$ {atualizacaoCusto.custoAntigo} → R$ {atualizacaoCusto.custoNovo}</p>
                      <div className="flex items-center gap-2">
                        <Checkbox id="manter-preco" checked={manterPrecoAntigo} onCheckedChange={(c) => setManterPrecoAntigo(!!c)} />
                        <label htmlFor="manter-preco" className="text-sm">Manter preço antigo</label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Button variant="outline" size="icon" onClick={() => setQuantidade(Math.max(1, quantidade - 1))} disabled={quantidade <= 1} className="h-12 w-12"><Minus className="h-4 w-4" /></Button>
                  <span className="text-2xl font-bold w-12 text-center">{quantidade}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantidade(quantidade + 1)} className="h-12 w-12"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between"><span className="text-sm">Detalhes</span>{detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div><Label>Observações</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Nota fiscal..." rows={2} className="mt-1.5" /></div>
                </CollapsibleContent>
              </Collapsible>

              <Button size="lg" className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={handleConfirmarEntrada} disabled={isConfirming}>
                <Plus className="h-5 w-5" />
                {isConfirming ? "Confirmando..." : `Confirmar Entrada (+${quantidade})`}
              </Button>
            </div>
          ) : operationType === "saida" && equipamentoSaida ? (
            /* SAÍDA MODE - Product Found */
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <PackageMinus className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-red-600">Registrar Saída</span>
                  <h3 className="text-lg font-semibold mt-1">{equipamentoSaida.nome}</h3>
                </div>
              </div>

              {/* Stock Highlight */}
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Estoque atual</p>
                <p className="text-4xl font-bold">{equipamentoSaida.quantidade_fisica || 0}</p>
                {(equipamentoSaida.quantidade_fisica || 0) - quantidade <= 2 && quantidade <= (equipamentoSaida.quantidade_fisica || 0) && (
                  <Badge variant="destructive" className="mt-2"><AlertTriangle className="h-3 w-3 mr-1" />Estoque ficará baixo!</Badge>
                )}
                {quantidade > (equipamentoSaida.quantidade_fisica || 0) && (
                  <Badge variant="destructive" className="mt-2"><AlertCircle className="h-3 w-3 mr-1" />Estoque insuficiente!</Badge>
                )}
              </div>

              <div>
                <Label>Quantidade a retirar</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Button variant="outline" size="icon" onClick={() => setQuantidade(Math.max(1, quantidade - 1))} disabled={quantidade <= 1} className="h-12 w-12"><Minus className="h-4 w-4" /></Button>
                  <span className="text-2xl font-bold w-12 text-center text-red-600">{quantidade}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantidade(quantidade + 1)} disabled={quantidade >= (equipamentoSaida.quantidade_fisica || 0)} className="h-12 w-12"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div>
                <Label>Motivo da saída</Label>
                <Select value={motivoSaida} onValueChange={setMotivoSaida}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_SAIDA.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div><Label>Observações</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalhes adicionais..." rows={2} className="mt-1.5" /></div>

              <Button size="lg" className="w-full gap-2 bg-red-600 hover:bg-red-700" onClick={handleConfirmarSaida} disabled={isConfirming || quantidade > (equipamentoSaida.quantidade_fisica || 0)}>
                <Minus className="h-5 w-5" />
                {isConfirming ? "Confirmando..." : `Confirmar Saída (-${quantidade})`}
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
                {operationType === "entrada" && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleOpenCadastro} className="gap-2"><Plus className="h-4 w-4" />Cadastrar Novo Produto</Button>
                    <Button variant="outline" onClick={() => setVincularDialogOpen(true)} className="gap-2"><Link2 className="h-4 w-4" />Vincular a Existente</Button>
                  </div>
                )}
                {operationType === "saida" && (
                  <p className="text-sm text-muted-foreground">Apenas produtos do estoque podem ter saída registrada.</p>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-2">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Escaneie ou digite um código para começar</p>
              </div>
            </div>
          )}
        </PremiumCard>
      </div>

      {/* Recent Movements from DB */}
      {movimentacoes && movimentacoes.length > 0 && (
        <PremiumCard className="p-6 mt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><History className="h-5 w-5" />Últimas Movimentações</h3>
          <div className="space-y-3">
            {movimentacoes.map((mov: any) => (
              <div key={mov.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  {mov.tipo?.includes("entrada") ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center"><Plus className="h-3 w-3 text-green-600" /></div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center"><Minus className="h-3 w-3 text-red-600" /></div>
                  )}
                  <span>{mov.equipamentos?.nome || "Produto"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={mov.tipo?.includes("entrada") ? "default" : "secondary"} className={mov.tipo?.includes("entrada") ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"}>
                    {mov.tipo?.includes("entrada") ? "+" : "-"}{mov.quantidade}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(mov.created_at), { addSuffix: true, locale: ptBR })}</span>
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
