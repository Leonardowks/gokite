import { useState } from "react";
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
} from "lucide-react";
import {
  useSyncSupplier,
  useImportSupplierProducts,
  useSupplierStats,
  useSupplierSheetUrl,
  SyncResult,
} from "@/hooks/useSupplierCatalog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function DuotoneSync() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("novidades");

  const { data: savedUrl } = useSupplierSheetUrl();
  const { data: stats, isLoading: statsLoading } = useSupplierStats();
  const syncMutation = useSyncSupplier();
  const importMutation = useImportSupplierProducts();

  // Usar URL salva se disponível
  const currentUrl = sheetUrl || savedUrl || "";

  const handleSync = async () => {
    if (!currentUrl) {
      toast.error("Cole o link da planilha do Google Sheets");
      return;
    }

    try {
      const result = await syncMutation.mutateAsync(currentUrl);
      setSyncResult(result);
      setSelectedSkus(new Set());
      toast.success(
        `Sincronizado! ${result.stats.total_parsed} produtos encontrados`
      );
    } catch (error) {
      console.error("Sync error:", error);
    }
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
      syncResult?.new_products.filter((p) => selectedSkus.has(p.sku)) || [];

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

  const calculateSalePrice = (cost: number, margin = 1.4) => {
    return Math.round(cost * margin);
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
      <PremiumCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Conectar com Google Sheets</h3>
          </div>

          <div className="flex gap-3">
            <Input
              placeholder="Cole o link da planilha do Google Sheets..."
              value={currentUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1"
            />
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
                  Sincronizar Agora
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Dica: A planilha precisa estar publicada na web. Vá em Arquivo →
            Compartilhar → Publicar na Web → CSV
          </p>

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
                <TabsTrigger value="importados" className="gap-2">
                  <Package className="h-4 w-4" />
                  Já Importados
                </TabsTrigger>
              </TabsList>

              {activeTab === "novidades" && selectedSkus.size > 0 && (
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
              )}
            </div>

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
                        <TableHead>Estoque Fornecedor</TableHead>
                        <TableHead className="text-right">
                          Preço Custo
                        </TableHead>
                        <TableHead className="text-right">
                          Preço Venda (+40%)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncResult.new_products.map((product) => (
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
                          <TableCell className="text-right font-mono">
                            {formatPrice(product.cost_price)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatPrice(
                              calculateSalePrice(product.cost_price)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
          </Tabs>
        </PremiumCard>
      )}

      {/* Initial State */}
      {!syncResult && !syncMutation.isPending && (
        <PremiumCard className="p-12 text-center">
          <Cloud className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Conecte seu Fornecedor
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Cole o link da planilha do Google Sheets da Duotone para
            sincronizar automaticamente todos os produtos disponíveis.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Importação em 1 clique
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Margem automática 40%
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Controle de reposição
            </div>
          </div>
        </PremiumCard>
      )}
    </div>
  );
}