import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  ShoppingBag,
  Webhook,
  Package,
  AlertTriangle
} from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { 
  useNuvemshopIntegration, 
  useConnectNuvemshop, 
  useDisconnectNuvemshop, 
  useSyncNuvemshop,
  useSyncNuvemshopProducts,
  useUpdateNuvemshopConfig
} from "@/hooks/useNuvemshopIntegration";
import { useAlertasCompraStats } from "@/hooks/useAlertasCompra";

export function NuvemshopIntegration() {
  const { data: integration, isLoading } = useNuvemshopIntegration();
  const { data: alertasStats } = useAlertasCompraStats();
  
  const connectMutation = useConnectNuvemshop();
  const disconnectMutation = useDisconnectNuvemshop();
  const syncMutation = useSyncNuvemshop();
  const syncProductsMutation = useSyncNuvemshopProducts();
  const updateConfigMutation = useUpdateNuvemshopConfig();

  const [storeId, setStoreId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuvemshop-webhook`;

  const isConnected = integration?.status === "connected";

  const handleConnect = () => {
    if (!storeId || !accessToken) return;
    connectMutation.mutate({ storeId, accessToken });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleSync = () => {
    if (!integration) return;
    syncMutation.mutate({ 
      storeId: integration.store_id, 
      accessToken: integration.access_token,
      syncProducts: integration.auto_sync_products,
      createTransactions: integration.auto_create_transactions,
    });
  };

  const handleSyncProducts = () => {
    if (!integration) return;
    syncProductsMutation.mutate({ 
      storeId: integration.store_id, 
      accessToken: integration.access_token,
    });
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
  };

  const updateConfig = (updates: { auto_create_transactions?: boolean; auto_sync_products?: boolean }) => {
    if (!integration) return;
    updateConfigMutation.mutate({ id: integration.id, updates });
  };

  if (isLoading) {
    return (
      <PremiumCard>
        <PremiumCardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </PremiumCardHeader>
        <PremiumCardContent>
          <Skeleton className="h-24 w-full" />
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <PremiumCard>
        <PremiumCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-primary" />
              </div>
              <div>
                <PremiumCardTitle className="flex items-center gap-2">
                  Nuvemshop
                  <PremiumBadge 
                    variant={isConnected ? 'success' : 'default'}
                    className="ml-2"
                  >
                    {isConnected ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="ml-1">{isConnected ? 'Conectado' : 'Desconectado'}</span>
                  </PremiumBadge>
                </PremiumCardTitle>
                <PremiumCardDescription>
                  Integre sua loja Nuvemshop para sincronizar pedidos automaticamente
                </PremiumCardDescription>
              </div>
            </div>
          </div>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-4">
          {isConnected && integration ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">
                      {integration.store_name || 'Loja conectada'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Store ID: {integration.store_id}
                    </p>
                    {integration.last_sync && (
                      <p className="text-xs text-muted-foreground">
                        Última sincronização: {new Date(integration.last_sync).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSync}
                    disabled={syncMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    Desconectar
                  </Button>
                </div>
              </div>

              {/* Alertas de Compra Pendentes */}
              {alertasStats && alertasStats.pendente > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium text-warning">
                        {alertasStats.pendente} alertas de compra pendentes
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Itens virtuais que precisam ser pedidos no fornecedor
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Sincronizar Produtos */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Vincular Produtos por SKU</p>
                    <p className="text-sm text-muted-foreground">
                      Conecta produtos da Nuvemshop com seu estoque local
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncProducts}
                  disabled={syncProductsMutation.isPending}
                >
                  <Package className={`h-4 w-4 mr-2 ${syncProductsMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncProductsMutation.isPending ? 'Vinculando...' : 'Vincular Produtos'}
                </Button>
              </div>

              <Separator />

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  URL do Webhook
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure este URL no painel da Nuvemshop em Configurações → Webhooks
                </p>
              </div>

              <Separator />

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Criar transações automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar vendas no módulo Financeiro ao receber pedidos
                    </p>
                  </div>
                  <Switch
                    checked={integration.auto_create_transactions}
                    onCheckedChange={(checked) => updateConfig({ auto_create_transactions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sincronizar produtos</Label>
                    <p className="text-sm text-muted-foreground">
                      Importar catálogo de produtos da Nuvemshop
                    </p>
                  </div>
                  <Switch
                    checked={integration.auto_sync_products}
                    onCheckedChange={(checked) => updateConfig({ auto_sync_products: checked })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeId">Store ID</Label>
                  <Input
                    id="storeId"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    placeholder="123456"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em Nuvemshop → Configurações → API
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="••••••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Token obtido via OAuth ou na API da Nuvemshop
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button 
                  onClick={handleConnect} 
                  disabled={connectMutation.isPending || !storeId || !accessToken}
                >
                  {connectMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Conectar Loja
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <a 
                    href="https://www.nuvemshop.com.br/partners/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação API
                  </a>
                </Button>
              </div>
            </>
          )}
        </PremiumCardContent>
      </PremiumCard>

      {/* Como funciona */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle>Como funciona a integração</PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <h4 className="font-medium mb-1">Conecte sua loja</h4>
              <p className="text-sm text-muted-foreground">
                Insira seu Store ID e Access Token obtidos no painel da Nuvemshop.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <h4 className="font-medium mb-1">Configure webhooks</h4>
              <p className="text-sm text-muted-foreground">
                Adicione o URL de webhook no painel da Nuvemshop para receber pedidos em tempo real.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <h4 className="font-medium mb-1">Vendas automáticas</h4>
              <p className="text-sm text-muted-foreground">
                Pedidos pagos são registrados automaticamente no módulo Vendas, com estoque e impostos calculados.
              </p>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
