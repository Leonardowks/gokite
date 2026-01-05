import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Wifi, 
  WifiOff, 
  QrCode, 
  RefreshCw, 
  Trash2,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  useEvolutionStatus,
  useSaveEvolutionConfig,
  useConnectEvolution,
  useDisconnectEvolution,
  useSyncEvolution,
  useDeleteEvolutionConfig,
  useSyncProgress,
} from '@/hooks/useEvolutionConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EvolutionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EvolutionConfigDialog({ open, onOpenChange }: EvolutionConfigDialogProps) {
  const [step, setStep] = useState<'config' | 'connect' | 'status'>('config');
  const [formData, setFormData] = useState({
    instanceName: '',
    apiUrl: '',
    apiKey: '',
  });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading, refetch } = useEvolutionStatus();
  const saveConfig = useSaveEvolutionConfig();
  const connect = useConnectEvolution();
  const disconnect = useDisconnectEvolution();
  const sync = useSyncEvolution();
  const deleteConfig = useDeleteEvolutionConfig();
  const syncProgress = useSyncProgress(activeJobId);

  // Definir step baseado no status
  useEffect(() => {
    if (status?.configured) {
      if (status.status === 'qrcode') {
        setStep('connect');
      } else {
        setStep('status');
      }
    } else {
      setStep('config');
    }
  }, [status]);

  // Limpar jobId quando sync terminar
  useEffect(() => {
    if (syncProgress?.status === 'concluido' || syncProgress?.status === 'erro') {
      // Manter visível por 5 segundos após completar
      const timer = setTimeout(() => {
        setActiveJobId(null);
        refetch();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncProgress?.status, refetch]);

  const handleSaveConfig = async () => {
    if (!formData.instanceName || !formData.apiUrl || !formData.apiKey) return;
    
    await saveConfig.mutateAsync(formData);
    setStep('connect');
  };

  const handleConnect = async () => {
    await connect.mutateAsync(formData.instanceName || undefined);
  };

  const handleDisconnect = async () => {
    await disconnect.mutateAsync(status?.instanceName);
  };

  const handleSync = async (action: 'contacts' | 'messages' | 'full') => {
    const result = await sync.mutateAsync(action);
    if (result.jobId) {
      setActiveJobId(result.jobId);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja remover a configuração?')) {
      await deleteConfig.mutateAsync(status?.instanceName);
      setStep('config');
      setFormData({ instanceName: '', apiUrl: '', apiKey: '' });
    }
  };

  const getStatusBadge = () => {
    switch (status?.status) {
      case 'conectado':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'qrcode':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><QrCode className="w-3 h-3 mr-1" />Aguardando QR</Badge>;
      case 'conectando':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  const getSyncStatusIcon = () => {
    if (!syncProgress) return null;
    
    switch (syncProgress.status) {
      case 'em_andamento':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'concluido':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'erro':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const progressPercent = syncProgress?.progresso_total 
    ? Math.round((syncProgress.progresso_atual / syncProgress.progresso_total) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            Evolution API - WhatsApp
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta do WhatsApp para sincronização automática de conversas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {statusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Step: Configuração */}
              {step === 'config' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiUrl">URL da Evolution API</Label>
                    <Input
                      id="apiUrl"
                      placeholder="https://sua-api.evolution.com"
                      value={formData.apiUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Sua chave de API"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instanceName">Nome da Instância</Label>
                    <Input
                      id="instanceName"
                      placeholder="gokite-crm"
                      value={formData.instanceName}
                      onChange={(e) => setFormData(prev => ({ ...prev, instanceName: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificador único para sua conexão WhatsApp
                    </p>
                  </div>

                  <Button 
                    onClick={handleSaveConfig} 
                    className="w-full"
                    disabled={saveConfig.isPending || !formData.instanceName || !formData.apiUrl || !formData.apiKey}
                  >
                    {saveConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar e Continuar
                  </Button>
                </div>
              )}

              {/* Step: Conectar */}
              {step === 'connect' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge()}
                  </div>

                  {status?.status === 'qrcode' && status.qrcode && (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="bg-white p-4 rounded-lg">
                        <img 
                          src={`data:image/png;base64,${status.qrcode}`} 
                          alt="QR Code" 
                          className="w-64 h-64"
                        />
                      </div>
                      <p className="text-sm text-center text-muted-foreground">
                        Abra o WhatsApp no seu celular → Menu ⋮ → Aparelhos conectados → Conectar um aparelho
                      </p>
                      <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                      </Button>
                    </div>
                  )}

                  {status?.status !== 'qrcode' && (
                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={handleConnect}
                        disabled={connect.isPending}
                      >
                        {connect.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Gerar QR Code
                      </Button>

                      <Button 
                        variant="ghost" 
                        onClick={() => setStep('config')}
                      >
                        Voltar para Configuração
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step: Status (Conectado) */}
              {step === 'status' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge()}
                  </div>

                  {status?.numeroConectado && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Número:</span>
                      <span className="font-mono text-sm">{status.numeroConectado}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{status?.totalContatos || 0}</p>
                      <p className="text-xs text-muted-foreground">Contatos</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <MessageSquare className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{status?.totalMensagens || 0}</p>
                      <p className="text-xs text-muted-foreground">Mensagens</p>
                    </div>
                  </div>

                  {status?.ultimaSincronizacao && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Última sync: {format(new Date(status.ultimaSincronizacao), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}

                  <Separator />

                  {/* Progresso da Sincronização */}
                  {syncProgress && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSyncStatusIcon()}
                          <span className="text-sm font-medium">
                            {syncProgress.status === 'em_andamento' && 'Sincronizando...'}
                            {syncProgress.status === 'concluido' && 'Concluído!'}
                            {syncProgress.status === 'erro' && 'Erro na sincronização'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {syncProgress.progresso_atual} / {syncProgress.progresso_total} chats
                        </span>
                      </div>
                      
                      <Progress value={progressPercent} className="h-2" />
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-background rounded">
                          <p className="font-bold text-green-500">{syncProgress.contatos_criados}</p>
                          <p className="text-muted-foreground">Novos</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                          <p className="font-bold text-blue-500">{syncProgress.contatos_atualizados}</p>
                          <p className="text-muted-foreground">Atualizados</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                          <p className="font-bold text-primary">{syncProgress.mensagens_criadas}</p>
                          <p className="text-muted-foreground">Mensagens</p>
                        </div>
                      </div>

                      {syncProgress.logs && syncProgress.logs.length > 0 && (
                        <ScrollArea className="h-24 w-full rounded border bg-background p-2">
                          <div className="space-y-1">
                            {syncProgress.logs.slice(-10).map((log, i) => (
                              <p key={i} className="text-xs font-mono text-muted-foreground">
                                {log}
                              </p>
                            ))}
                          </div>
                        </ScrollArea>
                      )}

                      {syncProgress.erro && (
                        <p className="text-xs text-red-500">{syncProgress.erro}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sincronização</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync('contacts')}
                        disabled={sync.isPending || syncProgress?.status === 'em_andamento'}
                      >
                        {sync.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Contatos
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync('messages')}
                        disabled={sync.isPending || syncProgress?.status === 'em_andamento'}
                      >
                        {sync.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Mensagens
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleSync('full')}
                        disabled={sync.isPending || syncProgress?.status === 'em_andamento'}
                      >
                        {sync.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Sync Completo
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    {status?.status === 'conectado' ? (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleDisconnect}
                        disabled={disconnect.isPending}
                      >
                        {disconnect.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <WifiOff className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleConnect}
                        disabled={connect.isPending}
                      >
                        {connect.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <QrCode className="w-4 h-4 mr-2" />
                        Reconectar
                      </Button>
                    )}
                    
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={handleDelete}
                      disabled={deleteConfig.isPending}
                    >
                      {deleteConfig.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
