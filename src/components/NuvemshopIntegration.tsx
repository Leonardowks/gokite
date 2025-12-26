import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  ShoppingBag,
  Webhook
} from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";

interface NuvemshopConfig {
  storeId: string;
  accessToken: string;
  webhookEnabled: boolean;
  autoSyncProducts: boolean;
  autoCreateTransactions: boolean;
  lastSync: string | null;
  status: 'disconnected' | 'connected' | 'error';
}

export function NuvemshopIntegration() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [config, setConfig] = useState<NuvemshopConfig>(() => {
    const saved = localStorage.getItem('nuvemshop_config');
    return saved ? JSON.parse(saved) : {
      storeId: '',
      accessToken: '',
      webhookEnabled: true,
      autoSyncProducts: true,
      autoCreateTransactions: true,
      lastSync: null,
      status: 'disconnected',
    };
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nuvemshop-webhook`;

  const handleConnect = async () => {
    if (!config.storeId || !config.accessToken) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Store ID e Access Token.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Test connection by calling sync function
      const { data, error } = await supabase.functions.invoke('nuvemshop-sync', {
        body: { 
          action: 'test',
          storeId: config.storeId,
          accessToken: config.accessToken,
        },
      });

      if (error) throw error;

      const newConfig = { 
        ...config, 
        status: 'connected' as const,
        lastSync: new Date().toISOString(),
      };
      setConfig(newConfig);
      localStorage.setItem('nuvemshop_config', JSON.stringify(newConfig));
      
      toast({
        title: "Conectado com sucesso!",
        description: "Sua loja Nuvemshop foi conectada ao GoKite.",
      });
    } catch (error: any) {
      console.error('Connection error:', error);
      const newConfig = { ...config, status: 'error' as const };
      setConfig(newConfig);
      localStorage.setItem('nuvemshop_config', JSON.stringify(newConfig));
      
      toast({
        title: "Erro ao conectar",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    const newConfig = {
      storeId: '',
      accessToken: '',
      webhookEnabled: true,
      autoSyncProducts: true,
      autoCreateTransactions: true,
      lastSync: null,
      status: 'disconnected' as const,
    };
    setConfig(newConfig);
    localStorage.setItem('nuvemshop_config', JSON.stringify(newConfig));
    
    toast({
      title: "Desconectado",
      description: "A integração com Nuvemshop foi removida.",
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('nuvemshop-sync', {
        body: { 
          action: 'sync',
          storeId: config.storeId,
          accessToken: config.accessToken,
          syncProducts: config.autoSyncProducts,
          createTransactions: config.autoCreateTransactions,
        },
      });

      if (error) throw error;

      const newConfig = { 
        ...config, 
        lastSync: new Date().toISOString(),
      };
      setConfig(newConfig);
      localStorage.setItem('nuvemshop_config', JSON.stringify(newConfig));

      toast({
        title: "Sincronização concluída!",
        description: `${data?.ordersImported || 0} pedidos importados.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "URL copiada!",
      description: "Cole esta URL nas configurações de webhook da Nuvemshop.",
    });
  };

  const updateConfig = (updates: Partial<NuvemshopConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('nuvemshop_config', JSON.stringify(newConfig));
  };

  const statusIcon = {
    connected: <CheckCircle2 className="h-5 w-5 text-success" />,
    disconnected: <XCircle className="h-5 w-5 text-muted-foreground" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
  };

  const statusLabel = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    error: 'Erro',
  };

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
                    variant={config.status === 'connected' ? 'success' : 'default'}
                    className="ml-2"
                  >
                    {statusIcon[config.status]}
                    <span className="ml-1">{statusLabel[config.status]}</span>
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
          {config.status === 'connected' ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">Loja conectada</p>
                    <p className="text-sm text-muted-foreground">
                      Store ID: {config.storeId}
                    </p>
                    {config.lastSync && (
                      <p className="text-xs text-muted-foreground">
                        Última sincronização: {new Date(config.lastSync).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleDisconnect}
                    className="text-destructive hover:text-destructive"
                  >
                    Desconectar
                  </Button>
                </div>
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
                    checked={config.autoCreateTransactions}
                    onCheckedChange={(checked) => updateConfig({ autoCreateTransactions: checked })}
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
                    checked={config.autoSyncProducts}
                    onCheckedChange={(checked) => updateConfig({ autoSyncProducts: checked })}
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
                    value={config.storeId}
                    onChange={(e) => updateConfig({ storeId: e.target.value })}
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
                    value={config.accessToken}
                    onChange={(e) => updateConfig({ accessToken: e.target.value })}
                    placeholder="••••••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Token obtido via OAuth ou na API da Nuvemshop
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? (
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
                Pedidos pagos são registrados automaticamente no módulo Vendas do GoKite.
              </p>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
