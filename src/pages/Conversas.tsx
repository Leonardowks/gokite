import { useState, useEffect, useCallback } from 'react';
import { ConversasList } from '@/components/ConversasList';
import { ChatView } from '@/components/ChatView';
import { InsightsIADrawer } from '@/components/InsightsIADrawer';
import { ContatoContextPanel } from '@/components/ContatoContextPanel';
import { ConnectionRequiredOverlay } from '@/components/ConnectionRequiredOverlay';
import { toast } from 'sonner';
import {
  useContatosComMensagens,
  useMensagensContato,
  useMarcarComoLida,
  useConversasRealtime,
  ConversaFiltro,
  ConversaOrdenacao,
  ContatoComUltimaMensagem,
} from '@/hooks/useConversasPage';
import { useInsightsContato, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';
import { useAnaliseAutomatica } from '@/hooks/useAnaliseAutomatica';
import { useEvolutionHealth, useContatoPolling } from '@/hooks/useEvolutionHealth';
import { useEvolutionStatus } from '@/hooks/useEvolutionConfig';
import { ArrowLeft, Sparkles, Wifi, WifiOff, RefreshCw, PanelRightClose, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Conversas = () => {
  const [selectedContatoId, setSelectedContatoId] = useState<string | null>(null);
  const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [filtro, setFiltro] = useState<ConversaFiltro>('todos');
  const [ordenacao, setOrdenacao] = useState<ConversaOrdenacao>('recentes');
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Queries
  const { data: contatos = [], isLoading: loadingContatos, refetch: refetchContatos } = useContatosComMensagens(filtro, ordenacao);
  const { data: mensagens = [], isLoading: loadingMensagens } = useMensagensContato(selectedContatoId);
  const { data: insights, isLoading: loadingInsights } = useInsightsContato(selectedContatoId);
  const { data: evolutionStatus } = useEvolutionStatus();

  // Mutations
  const marcarComoLidaMutation = useMarcarComoLida();
  const analisarMutation = useAnalisarConversas();

  // Fase 3: IA Proativa
  useAnaliseAutomatica(true);

  // Status de conexão
  const isConnected = evolutionStatus?.status === 'conectado';

  // Health check e polling fallback
  const { reconfigureWebhook } = useEvolutionHealth(isConnected);
  
  // Polling específico quando visualizando uma conversa
  useContatoPolling(selectedContatoId, isConnected);

  // Determinar status para privacy mode
  const privacyStatus = isConnected 
    ? null 
    : (evolutionStatus?.status === 'conectando' 
      ? 'conectando' 
      : (evolutionStatus?.status === 'qrcode' 
        ? 'qrcode' 
        : 'desconectado')) as 'desconectado' | 'conectando' | 'qrcode' | null;

  // Contato selecionado
  const contatoSelecionado = contatos.find((c) => c.id === selectedContatoId) || null;

  // Handler para reconectar webhook
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconfigureWebhook();
      toast.success('Webhook reconfigurado!');
      refetchContatos();
    } catch (error) {
      toast.error('Erro ao reconfigurar webhook');
    } finally {
      setIsReconnecting(false);
    }
  };

  // Realtime
  const handleNovaMensagem = useCallback((mensagem: any) => {
    if (!mensagem.is_from_me) {
      const contato = contatos.find(c => c.id === mensagem.contato_id);
      const displayName = contato?.whatsapp_profile_name || contato?.nome || 'Contato';
      toast.info(
        `Nova mensagem de ${displayName}`,
        {
          description: mensagem.conteudo?.slice(0, 50) + (mensagem.conteudo?.length > 50 ? '...' : ''),
          action: {
            label: 'Ver',
            onClick: () => setSelectedContatoId(mensagem.contato_id),
          },
        }
      );
    }
  }, [contatos]);

  useConversasRealtime(handleNovaMensagem);

  // Marcar como lida quando selecionar conversa
  useEffect(() => {
    if (selectedContatoId && contatoSelecionado?.nao_lidas && contatoSelecionado.nao_lidas > 0) {
      marcarComoLidaMutation.mutate(selectedContatoId);
    }
  }, [selectedContatoId, contatoSelecionado?.nao_lidas]);

  const handleSelect = (id: string) => {
    setSelectedContatoId(id);
    // Abre o painel de contexto automaticamente ao selecionar contato
    setContextPanelOpen(true);
  };

  const handleAnalisar = () => {
    if (selectedContatoId) {
      setInsightsDrawerOpen(true);
      if (!insights) {
        analisarMutation.mutate(selectedContatoId);
      }
    }
  };

  const handleReanalizar = () => {
    if (selectedContatoId) {
      analisarMutation.mutate(selectedContatoId);
    }
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Header Compacto */}
        <header className="h-14 shrink-0 px-4 flex items-center justify-between border-b bg-card">
          <h1 className="text-lg font-semibold">Conversas</h1>
          
          <div className="flex items-center gap-2">
            {/* Status de conexão */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  {isConnected ? (
                    <Badge variant="outline" className="gap-1.5 text-xs bg-green-500/10 border-green-500/30 text-green-600">
                      <Wifi className="h-3 w-3" />
                      <span className="hidden sm:inline">Conectado</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 text-xs bg-destructive/10 border-destructive/30 text-destructive">
                      <WifiOff className="h-3 w-3" />
                      <span className="hidden sm:inline">Offline</span>
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}</p>
              </TooltipContent>
            </Tooltip>

            {isConnected && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                  >
                    <RefreshCw className={cn('h-4 w-4', isReconnecting && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sincronizar</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Badge variant="outline" className="gap-1.5 text-xs bg-primary/5 border-primary/20 text-primary">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">IA Proativa</span>
            </Badge>
          </div>
        </header>

        {/* Container Principal */}
        <div className="flex-1 flex overflow-hidden">
          {/* Privacy Mode: Overlay quando desconectado */}
          {privacyStatus ? (
            <div className="flex-1">
              <ConnectionRequiredOverlay status={privacyStatus} />
            </div>
          ) : (
            <>
              {/* Lista - Desktop */}
              <aside className={cn(
                'w-full lg:w-80 xl:w-[350px] border-r border-border/50 flex-shrink-0',
                selectedContatoId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
              )}>
                <ConversasList
                  contatos={contatos}
                  isLoading={loadingContatos}
                  selectedId={selectedContatoId}
                  onSelect={handleSelect}
                  filtro={filtro}
                  onFiltroChange={setFiltro}
                  ordenacao={ordenacao}
                  onOrdenacaoChange={setOrdenacao}
                />
              </aside>

          {/* Chat - Desktop (70% quando painel aberto, 100% quando fechado) */}
          <main className={cn(
            'hidden lg:flex lg:flex-col min-w-0 transition-all duration-200',
            contextPanelOpen && selectedContatoId ? 'flex-[7]' : 'flex-1'
          )}>
            {/* Botão toggle do painel */}
            {selectedContatoId && (
              <div className="absolute right-0 top-16 z-10">
                {!contextPanelOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-l-lg rounded-r-none border-r-0 bg-card shadow-md"
                        onClick={() => setContextPanelOpen(true)}
                      >
                        <PanelRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Abrir painel de contexto</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            <ChatView
              contato={contatoSelecionado}
              mensagens={mensagens}
              isLoading={loadingMensagens}
              onAnalisar={handleAnalisar}
              isAnalisando={analisarMutation.isPending}
            />
          </main>

          {/* Painel de Contexto - Desktop (30%) */}
          {selectedContatoId && contextPanelOpen && (
            <aside className="hidden lg:flex flex-[3] min-w-[280px] max-w-[400px]">
              <ContatoContextPanel
                contato={contatoSelecionado}
                onClose={() => setContextPanelOpen(false)}
              />
            </aside>
          )}

          {/* Chat - Mobile (quando selecionado) */}
          {selectedContatoId && (
            <div className="lg:hidden flex flex-col flex-1 min-w-0">
              {/* Header Mobile com Voltar */}
              <div className="h-12 shrink-0 px-2 flex items-center gap-2 border-b bg-card">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContatoId(null)}
                  className="h-10 gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </div>
              
              <div className="flex-1 min-h-0">
                <ChatView
                  contato={contatoSelecionado}
                  mensagens={mensagens}
                  isLoading={loadingMensagens}
                  onAnalisar={handleAnalisar}
                  isAnalisando={analisarMutation.isPending}
                />
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Drawer de Insights IA (mantido para análise mais detalhada) */}
        <InsightsIADrawer
          open={insightsDrawerOpen}
          onOpenChange={setInsightsDrawerOpen}
          contato={contatoSelecionado}
          insights={insights || null}
          isLoading={loadingInsights}
          onReanalizar={handleReanalizar}
          isAnalisando={analisarMutation.isPending}
        />
      </div>
    </TooltipProvider>
  );
};

export default Conversas;
