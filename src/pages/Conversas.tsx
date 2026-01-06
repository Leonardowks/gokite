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
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Conversas = () => {
  const [selectedContatoId, setSelectedContatoId] = useState<string | null>(null);
  const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false);
  const [detalhesDrawerOpen, setDetalhesDrawerOpen] = useState(false);
  const [contatoParaDetalhes, setContatoParaDetalhes] = useState<ContatoComUltimaMensagem | null>(null);
  const [filtro, setFiltro] = useState<ConversaFiltro>('todos');
  const [ordenacao, setOrdenacao] = useState<ConversaOrdenacao>('recentes');

  // Queries
  const { data: contatos = [], isLoading: loadingContatos, refetch: refetchContatos } = useContatosComMensagens(filtro, ordenacao);
  const { data: mensagens = [], isLoading: loadingMensagens } = useMensagensContato(selectedContatoId);
  const { data: insights, isLoading: loadingInsights } = useInsightsContato(selectedContatoId);

  // Mutations
  const marcarComoLidaMutation = useMarcarComoLida();
  const analisarMutation = useAnalisarConversas();

  // Contato selecionado
  const contatoSelecionado = contatos.find((c) => c.id === selectedContatoId) || null;

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
    <div className="flex flex-col h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)]">
      <PageHeader
        title="Conversas"
        description="Central de mensagens WhatsApp"
      />

      {/* Layout de duas colunas */}
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
  );
};

export default Conversas;
