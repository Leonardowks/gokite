import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { SkeletonPremium } from "@/components/ui/skeleton-premium";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Cloud,
  RefreshCw,
  Download,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShoppingCart,
  Percent,
  Store,
  CloudOff,
  Trash2,
  Info,
  ArrowRight,
  PlayCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useSyncSupplier,
  useImportSupplierProducts,
  useSupplierStats,
  useSupplierSheetUrl,
  useVirtualSupplierEquipamentos,
  useDeleteVirtualEquipamento,
  SyncResult,
} from "@/hooks/useSupplierCatalog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TrazerParaLojaDialog } from "@/components/TrazerParaLojaDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DuotoneSync() {
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("novidades");
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [globalMargin, setGlobalMargin] = useState<number>(40);
  const [trazerDialogOpen, setTrazerDialogOpen] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<{
    id: string;
    nome: string;
    cost_price?: number | null;
    sale_price?: number | null;
  } | null>(null);

  const { data: savedUrl } = useSupplierSheetUrl();
  const { data: stats, isLoading: statsLoading } = useSupplierStats();
  const { data: virtualEquipamentos, isLoading: virtualLoading } = useVirtualSupplierEquipamentos();
  const syncMutation = useSyncSupplier();
  const importMutation = useImportSupplierProducts();
  const deleteMutation = useDeleteVirtualEquipamento();

  // Banners explicativos por aba
  const tabBanners = {
    novidades: {
      icon: Sparkles,
      color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      text: "Produtos novos no fornecedor que você ainda não tem. Importe para vender sob encomenda."
    },
    reposicao: {
      icon: AlertCircle,
      color: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400",
      text: "Seu estoque zerou! Estes produtos estão disponíveis no fornecedor para repor."
    },
    "meus-virtuais": {
      icon: Cloud,
      color: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400",
      text: "Produtos importados aguardando chegada. Quando receber, clique 'Trazer p/ Loja'. Importou errado? Use 'Excluir'."
    },
    importados: {
      icon: CheckCircle2,
      color: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400",
      text: "Histórico de produtos sincronizados do fornecedor que já estão no seu catálogo."
    }
  };

  // Inicializar URL com valor salvo apenas uma vez
  useEffect(() => {
    if (savedUrl && !urlInitialized) {
      setSheetUrl(savedUrl);
      setUrlInitialized(true);
    }
  }, [savedUrl, urlInitialized]);

  // URL atual para sincronização
  const currentUrl = sheetUrl || "";

  const handleSync = async () => {
    if (!currentUrl) {
      toast.error("Cole o link da planilha do Google Sheets");
      return;
    }

    try {
      const result = await syncMutation.mutateAsync(currentUrl);
      setSyncResult(result);
      setSelectedSkus(new Set());
      
      // Inicializar preços com margem 40% como sugestão
      const initialPrices: Record<string, number> = {};
      result.new_products.forEach((p) => {
        initialPrices[p.sku] = Math.round(p.cost_price * 1.4);
      });
      setCustomPrices(initialPrices);
      
      toast.success(
        `Sincronizado! ${result.stats.total_parsed} produtos encontrados`
      );
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  const handlePriceChange = (sku: string, value: string) => {
    const numValue = parseFloat(value.replace(/\D/g, "")) || 0;
    setCustomPrices((prev) => ({ ...prev, [sku]: numValue }));
  };

  const calculateMargin = (cost: number, sale: number) => {
    if (cost <= 0) return 0;
    return Math.round(((sale - cost) / cost) * 100);
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-green-600";
    if (margin >= 15) return "text-yellow-600";
    return "text-red-600";
  };

  const handleApplyGlobalMargin = () => {
    if (selectedSkus.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    const newPrices = { ...customPrices };
    syncResult?.new_products
      .filter((p) => selectedSkus.has(p.sku))
      .forEach((p) => {
        newPrices[p.sku] = Math.round(p.cost_price * (1 + globalMargin / 100));
      });
    setCustomPrices(newPrices);
    toast.success(`Margem de ${globalMargin}% aplicada a ${selectedSkus.size} produto(s)`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && syncResult?.new_products) {
      setSelectedSkus(new Set(syncResult.new_products.map((p) => p.sku)));
    } else {
      setSelectedSkus(new Set());
    }
  };

  const handleSelectProduct = (sku: string, checked: boolean) => {
    const newSelected = new Set(selectedSkus);
    if (checked) {
      newSelected.add(sku);
    } else {
      newSelected.delete(sku);
    }
    setSelectedSkus(newSelected);
  };

  const handleImportSelected = async () => {
    if (selectedSkus.size === 0) {
      toast.error("Selecione pelo menos um produto para importar");
      return;
    }

    const productsToImport =
      syncResult?.new_products
        .filter((p) => selectedSkus.has(p.sku))
        .map((p) => ({
          ...p,
          sale_price: customPrices[p.sku] || Math.round(p.cost_price * 1.4),
        })) || [];

    try {
      await importMutation.mutateAsync(productsToImport);
      // Remover importados da lista
      if (syncResult) {
        setSyncResult({
          ...syncResult,
          new_products: syncResult.new_products.filter(
            (p) => !selectedSkus.has(p.sku)
          ),
          stats: {
            ...syncResult.stats,
            new_products: syncResult.stats.new_products - selectedSkus.size,
            already_imported:
              syncResult.stats.already_imported + selectedSkus.size,
          },
        });
      }
      setSelectedSkus(new Set());
    } catch (error) {
      console.error("Import error:", error);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sincronizador Duotone"
        description="Importe produtos do fornecedor direto para seu estoque"
      />

      <EstoqueSubmenu />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cloud className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">No Fornecedor</p>
              {statsLoading ? (
                <SkeletonPremium className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">
                  <AnimatedNumber value={stats?.totalSupplier || 0} />
                </p>
              )}
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Já Importados</p>
              {statsLoading ? (
                <SkeletonPremium className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">
                  <AnimatedNumber value={stats?.imported || 0} />
                </p>
              )}
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Novos Disponíveis</p>
              {statsLoading ? (
                <SkeletonPremium className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">
                  <AnimatedNumber value={stats?.pending || 0} />
                </p>
              )}
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última Sync</p>
              <p className="text-sm font-medium">
                {stats?.lastSyncedAt
                  ? formatDistanceToNow(new Date(stats.lastSyncedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : "Nunca"}
              </p>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Sync Configuration */}
      <TooltipProvider>
        <PremiumCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Conectar com Google Sheets</h3>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Cole o link da planilha do Google Sheets..."
                  value={sheetUrl || ""}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="pr-10"
                />
                {sheetUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-destructive/10"
                    onClick={() => setSheetUrl("")}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSync}
                    disabled={syncMutation.isPending}
                    className="gap-2"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sincronizar
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Baixa a planilha e atualiza produtos disponíveis</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Importante:</strong> A planilha precisa estar{" "}
                <strong>publicada na web como CSV</strong>. Vá em{" "}
                <span className="font-mono text-xs bg-muted px-1 rounded">
                  Arquivo → Compartilhar → Publicar na Web
                </span>{" "}
                → selecione a aba correta → escolha CSV.{" "}
                <a 
                  href="https://support.google.com/docs/answer/183965" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Ver tutorial
                </a>
              </AlertDescription>
            </Alert>

            {syncResult && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Sincronização concluída com sucesso!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {syncResult.stats.total_parsed} produtos encontrados •
                    Colunas detectadas: {syncResult.columns_detected.join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </PremiumCard>
      </TooltipProvider>

      {/* Results Tabs */}
      {syncResult && (
        <PremiumCard className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="novidades" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Novidades
                  {syncResult.stats.new_products > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {syncResult.stats.new_products}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reposicao" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Reposição
                  {syncResult.stats.restock_needed > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {syncResult.stats.restock_needed}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="meus-virtuais" className="gap-2">
                  <CloudOff className="h-4 w-4" />
                  Meus Virtuais
                  {(virtualEquipamentos?.length || 0) > 0 && (
                    <Badge variant="outline" className="ml-1 bg-blue-500/10 text-blue-600">
                      {virtualEquipamentos?.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="importados" className="gap-2">
                  <Package className="h-4 w-4" />
                  Já Importados
                </TabsTrigger>
              </TabsList>

              {activeTab === "novidades" && selectedSkus.size > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleImportSelected}
                      disabled={importMutation.isPending}
                      className="gap-2"
                    >
                      {importMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Importar {selectedSkus.size} Selecionado(s)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adiciona ao seu catálogo para venda sob encomenda</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Banner contextual */}
            {tabBanners[activeTab as keyof typeof tabBanners] && (
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${tabBanners[activeTab as keyof typeof tabBanners].color}`}>
                {(() => {
                  const IconComponent = tabBanners[activeTab as keyof typeof tabBanners].icon;
                  return <IconComponent className="h-4 w-4 shrink-0" />;
                })()}
                <p className="text-sm">{tabBanners[activeTab as keyof typeof tabBanners].text}</p>
              </div>
            )}

            {/* Tab: Novidades */}
            <TabsContent value="novidades">
              {syncResult.new_products.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">
                    Tudo sincronizado!
                  </h3>
                  <p className="text-muted-foreground">
                    Todos os produtos do fornecedor já estão no seu catálogo.
                  </p>
                </div>
              ) : (
                <>
                  {/* Controle de Margem Global */}
                  <div className="flex items-center gap-4 p-4 mb-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Margem Global:</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={globalMargin}
                        onChange={(e) => setGlobalMargin(Number(e.target.value))}
                        className="w-20 text-center"
                        min={0}
                        max={200}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyGlobalMargin}
                      disabled={selectedSkus.size === 0}
                      className="gap-2"
                    >
                      Aplicar aos {selectedSkus.size} Selecionado(s)
                    </Button>
                    
                    <span className="text-xs text-muted-foreground ml-auto">
                      Fórmula: Custo × {(1 + globalMargin / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedSkus.size ===
                              syncResult.new_products.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead className="text-right">
                          Custo
                        </TableHead>
                        <TableHead className="text-right">
                          Preço Venda
                        </TableHead>
                        <TableHead className="text-right">
                          Margem
                        </TableHead>
                        <TableHead>
                          Categoria Fiscal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncResult.new_products.map((product) => {
                        const salePrice = customPrices[product.sku] || Math.round(product.cost_price * 1.4);
                        const margin = calculateMargin(product.cost_price, salePrice);
                        
                        return (
                          <TableRow key={product.sku}>
                            <TableCell>
                              <Checkbox
                                checked={selectedSkus.has(product.sku)}
                                onCheckedChange={(checked) =>
                                  handleSelectProduct(
                                    product.sku,
                                    checked as boolean
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {product.brand} {product.product_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  SKU: {product.sku}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.size || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {product.supplier_stock_qty} un.
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatPrice(product.cost_price)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="text"
                                value={formatPrice(salePrice).replace("R$", "").trim()}
                                onChange={(e) => handlePriceChange(product.sku, e.target.value)}
                                className="w-28 text-right font-mono"
                              />
                            </TableCell>
                            <TableCell className={`text-right font-mono font-semibold ${getMarginColor(margin)}`}>
                              {margin}%
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                Produto Novo (8%)
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Tab: Reposição */}
            <TabsContent value="reposicao">
              {syncResult.restock_products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">
                    Estoque em dia!
                  </h3>
                  <p className="text-muted-foreground">
                    Não há produtos precisando de reposição no momento.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead className="text-center">
                          Seu Estoque
                        </TableHead>
                        <TableHead className="text-center">
                          Estoque Duotone
                        </TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncResult.restock_products.map((item) => (
                        <TableRow key={item.product.sku}>
                          <TableCell>
                            <p className="font-medium">
                              {item.product.product_name}
                            </p>
                          </TableCell>
                          <TableCell>{item.product.size || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">
                              {item.currentStock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-500/10">
                              {item.product.supplier_stock_qty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="gap-2">
                              <ShoppingCart className="h-3 w-3" />
                              Pedir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Já Importados */}
            <TabsContent value="importados">
              {syncResult.already_imported.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Nenhum importado ainda</h3>
                  <p className="text-muted-foreground">
                    Selecione produtos na aba "Novidades" para importar.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncResult.already_imported.map((product) => (
                        <TableRow key={product.sku}>
                          <TableCell className="font-medium">
                            {product.product_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.sku}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-600"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              No Sistema
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Meus Virtuais (Sob Encomenda) */}
            <TabsContent value="meus-virtuais">
              {virtualLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <SkeletonPremium key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (virtualEquipamentos?.length || 0) === 0 ? (
                <div className="text-center py-12">
                  <Cloud className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Nenhum produto virtual</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Importe produtos na aba "Novidades" para criar seu catálogo sob encomenda.
                  </p>
                  
                  {/* Steps explicativos */}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                      <span>Sincronizar</span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</span>
                      <span>Selecionar</span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</span>
                      <span>Importar</span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">4</span>
                      <span>Vender</span>
                    </div>
                  </div>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm">
                        ☁️ <strong>Produtos Virtuais:</strong> Estes produtos estão no seu catálogo mas ainda não chegaram do fornecedor. 
                        Quando receber o pedido, clique em <strong>"Trazer para Loja"</strong> para mover para o estoque físico.
                      </p>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>SKU Fornecedor</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Venda</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {virtualEquipamentos?.map((eq) => {
                          const margin = eq.cost_price && eq.sale_price 
                            ? Math.round(((eq.sale_price - eq.cost_price) / eq.cost_price) * 100)
                            : 0;
                          
                          return (
                            <TableRow key={eq.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Cloud className="h-4 w-4 text-blue-500" />
                                  <div>
                                    <p className="font-medium">{eq.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {eq.tipo} {eq.tamanho && `• ${eq.tamanho}`}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-sm">
                                {eq.supplier_sku || "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {formatPrice(eq.cost_price || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {formatPrice(eq.sale_price || 0)}
                              </TableCell>
                              <TableCell className={`text-right font-mono font-semibold ${getMarginColor(margin)}`}>
                                {margin}%
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => {
                                          setSelectedEquipamento({
                                            id: eq.id,
                                            nome: eq.nome,
                                            cost_price: eq.cost_price,
                                            sale_price: eq.sale_price,
                                          });
                                          setTrazerDialogOpen(true);
                                        }}
                                      >
                                        <Store className="h-3 w-3" />
                                        Trazer p/ Loja
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Produto chegou? Move para estoque físico</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Importou errado? Remove do catálogo</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir produto importado?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          O produto <strong>"{eq.nome}"</strong> será removido do seu catálogo. 
                                          Na próxima sincronização, ele aparecerá novamente em "Novidades".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMutation.mutate(eq.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TooltipProvider>
            )}
          </TabsContent>
          </Tabs>
        </PremiumCard>
      )}

      {/* Initial State - Melhorado */}
      {!syncResult && !syncMutation.isPending && (
        <PremiumCard className="p-12">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
              <Cloud className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">
              Conecte seu Fornecedor
            </h3>
            <p className="text-muted-foreground mb-8">
              Venda produtos sem ter estoque físico! Sincronize com a planilha Duotone 
              e ofereça todo o catálogo para seus clientes.
            </p>
            
            {/* Passo a passo visual */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { step: 1, label: "Cole o link", desc: "Planilha Duotone" },
                { step: 2, label: "Sincronize", desc: "Atualiza catálogo" },
                { step: 3, label: "Importe", desc: "Escolha produtos" },
                { step: 4, label: "Venda", desc: "Sem estoque físico" },
              ].map((item, i) => (
                <div key={item.step} className="text-center">
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold
                    ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {item.step}
                  </div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Importação em 1 clique
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Margem automática 40%
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Controle de reposição
              </div>
            </div>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("https://docs.lovable.dev", "_blank")}
            >
              <PlayCircle className="h-4 w-4" />
              Ver Tutorial
            </Button>
          </div>
        </PremiumCard>
      )}

      {/* Dialog Trazer para Loja */}
      <TrazerParaLojaDialog
        open={trazerDialogOpen}
        onOpenChange={setTrazerDialogOpen}
        equipamento={selectedEquipamento}
      />
    </div>
  );
}