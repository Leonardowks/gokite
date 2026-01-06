import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConversasList } from '@/components/ConversasList';
import { ChatView } from '@/components/ChatView';
import { InsightsIADrawer } from '@/components/InsightsIADrawer';
import { ContatoDetalhesDrawer } from '@/components/ContatoDetalhesDrawer';
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
import { ArrowLeft, Sparkles, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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
  const [detalhesDrawerOpen, setDetalhesDrawerOpen] = useState(false);
  const [contatoParaDetalhes, setContatoParaDetalhes] = useState<ContatoComUltimaMensagem | null>(null);
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

  // Fase 3: IA Proativa - Análise automática em background
  useAnaliseAutomatica(true);

  // Health check e polling fallback
  const { reconfigureWebhook } = useEvolutionHealth(evolutionStatus?.status === 'conectado');
  
  // Polling específico quando visualizando uma conversa
  useContatoPolling(selectedContatoId, evolutionStatus?.status === 'conectado');

  // Status de conexão
  const isConnected = evolutionStatus?.status === 'conectado';

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
  };

  const handleAvatarClick = (contato: ContatoComUltimaMensagem) => {
    setContatoParaDetalhes(contato);
    setDetalhesDrawerOpen(true);
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
    <div className="flex flex-col h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PageHeader
          title="Conversas"
          description="Central de mensagens WhatsApp"
        />
        <div className="flex items-center gap-2">
          {/* Indicador de status da conexão */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <Badge variant="outline" className="gap-1 text-xs bg-green-500/10 border-green-500/30 text-green-600">
                    <Wifi className="h-3 w-3" />
                    <span className="hidden sm:inline">Conectado</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs bg-destructive/10 border-destructive/30 text-destructive">
                    <WifiOff className="h-3 w-3" />
                    <span className="hidden sm:inline">Desconectado</span>
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isConnected ? 'WhatsApp conectado e sincronizando' : 'WhatsApp não conectado'}</p>
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
                <p>Reconfigurar sincronização</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Badge variant="outline" className="gap-1.5 text-xs bg-primary/5 border-primary/20 text-primary">
            <Sparkles className="h-3 w-3" />
            IA Proativa
          </Badge>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 border rounded-xl overflow-hidden bg-card shadow-sm mt-4 min-h-0">
        {/* Lista de conversas - Coluna esquerda */}
        <div className={cn(
          'lg:col-span-4 xl:col-span-3 border-r border-border/50 overflow-hidden',
          selectedContatoId ? 'hidden lg:block' : 'block'
        )}>
          <ConversasList
            contatos={contatos}
            isLoading={loadingContatos}
            selectedId={selectedContatoId}
            onSelect={handleSelect}
            onAvatarClick={handleAvatarClick}
            filtro={filtro}
            onFiltroChange={setFiltro}
            ordenacao={ordenacao}
            onOrdenacaoChange={setOrdenacao}
          />
        </div>

        {/* Chat - Coluna direita (desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 overflow-hidden hidden lg:block">
          <ChatView
            contato={contatoSelecionado}
            mensagens={mensagens}
            isLoading={loadingMensagens}
            onAnalisar={handleAnalisar}
            isAnalisando={analisarMutation.isPending}
          />
        </div>

        {/* Mobile: mostrar chat quando selecionado */}
        {selectedContatoId && (
          <div className="lg:hidden h-full flex flex-col">
            <div className="p-2 border-b flex items-center gap-2 bg-card shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContatoId(null)}
                className="gap-1.5 h-9 min-w-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Voltar</span>
              </Button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
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
      </div>

      {/* Drawer de Insights IA */}
      <InsightsIADrawer
        open={insightsDrawerOpen}
        onOpenChange={setInsightsDrawerOpen}
        contato={contatoSelecionado}
        insights={insights || null}
        isLoading={loadingInsights}
        onReanalizar={handleReanalizar}
        isAnalisando={analisarMutation.isPending}
      />

      {/* Drawer de Detalhes do Contato */}
      <ContatoDetalhesDrawer
        open={detalhesDrawerOpen}
        onOpenChange={setDetalhesDrawerOpen}
        contato={contatoParaDetalhes}
      />
    </div>
    </TooltipProvider>
  );
};

export default Conversas;
