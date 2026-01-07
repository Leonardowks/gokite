import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { useSearchByEan, useConfirmarEntrada, useMovimentacoesRecentes, useVerificarAtualizacaoCusto } from "@/hooks/useReceberMercadoria";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ReceberMercadoria() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [notas, setNotas] = useState("");
  const [precoVenda, setPrecoVenda] = useState<number | null>(null);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manterPrecoAntigo, setManterPrecoAntigo] = useState(false);

  const { feedback } = useScannerFeedback();

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

  // Provide feedback when search result changes
  useEffect(() => {
    if (!isSearching && activeCode) {
      if (searchResult?.found) {
        // Product found - success feedback
        if (atualizacaoCusto) {
          // Cost changed - warning feedback
          feedback('warning');
        }
      } else {
        // Not found - error feedback
        feedback('error');
      }
    }
  }, [searchResult, isSearching, activeCode, atualizacaoCusto]);

  const handleScan = (code: string) => {
    setScannedCode(code);
    setQuantidade(1);
    setNotas("");
    setPrecoVenda(null);
    setManterPrecoAntigo(false);
  };

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
          feedback('confirm');
          resetState();
        },
        onError: () => {
          feedback('error');
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
          feedback('confirm');
          resetState();
        },
        onError: () => {
          feedback('error');
        },
      });
    }
  };

  const resetState = () => {
    setScannedCode(null);
    setManualCode("");
    setQuantidade(1);
    setNotas("");
    setPrecoVenda(null);
    setManterPrecoAntigo(false);
    setScannerOpen(false);
  };

  const handleManualSearch = () => {
    if (manualCode.length >= 3) {
      // Trigger search by updating the code
      setManualCode(manualCode.trim());
    }
  };

  const productData = searchResult?.source === "supplier" 
    ? searchResult.supplierProduct 
    : searchResult?.equipamento;

  const suggestedPrice = searchResult?.supplierProduct 
    ? Math.round(searchResult.supplierProduct.cost_price * 1.4)
    : null;

  return (
    <>
      <PageHeader
        title="Receber Mercadoria"
        description="Dê entrada em produtos via código de barras"
      />
      
      <EstoqueSubmenu className="mb-6" />

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
                      className="font-mono"
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    />
                    <Button onClick={handleManualSearch} disabled={manualCode.length < 3}>
                      Buscar
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
            <div className="h-full flex items-center justify-center">
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">
                      Produto encontrado
                    </span>
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
                    {"size" in productData ? productData.size : productData.tamanho} || "N/A"
                  </p>
                </div>
                {"brand" in productData && (
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

              {/* Cost Update Alert (for existing equipment with price change) */}
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
                          <div className="flex items-center gap-2">
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
                              {atualizacaoCusto.percentualVariacao > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {atualizacaoCusto.percentualVariacao > 0 ? "+" : ""}
                              {atualizacaoCusto.percentualVariacao.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Venda sugerida:</span>
                          <div className="flex items-center gap-2">
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
                        <label 
                          htmlFor="manter-preco" 
                          className="text-sm cursor-pointer"
                        >
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
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{quantidade}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidade(quantidade + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

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

              {/* Confirm Button */}
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleConfirmarEntrada}
                disabled={isConfirming}
              >
                <ArrowRight className="h-5 w-5" />
                Dar Entrada no Estoque Físico
              </Button>
            </div>
          ) : activeCode && !isSearching ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Produto não encontrado</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Código "{activeCode}" não está no catálogo Duotone nem no estoque.
                  </p>
                </div>
                <Button variant="outline" onClick={() => {
                  setScannedCode(null);
                  setManualCode("");
                }}>
                  Tentar outro código
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center min-h-[300px]">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Escaneie ou digite um código para começar
                </p>
              </div>
            </div>
          )}
        </PremiumCard>
      </div>

      {/* Recent Movements */}
      <PremiumCard className="mt-6 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Últimas Movimentações</h3>
        </div>
        
        {movimentacoes && movimentacoes.length > 0 ? (
          <div className="space-y-3">
            {movimentacoes.map((mov: any) => (
              <div
                key={mov.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    mov.tipo === "entrada_fisica" ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    {mov.tipo === "entrada_fisica" ? (
                      <Plus className="h-4 w-4 text-green-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {mov.equipamentos?.nome || "Equipamento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mov.origem} • {mov.quantidade} unidade(s)
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(mov.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma movimentação recente
          </p>
        )}
      </PremiumCard>

      {/* Scanner Modal */}
      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
          isSearching={isSearching}
        />
      )}
    </>
  );
}
