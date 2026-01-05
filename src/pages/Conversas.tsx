import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConversasList } from '@/components/ConversasList';
import { ChatView } from '@/components/ChatView';
import { InsightsIADrawer } from '@/components/InsightsIADrawer';
import { toast } from 'sonner';
import {
  useContatosComMensagens,
  useMensagensContato,
  useMarcarComoLida,
  useConversasRealtime,
  ConversaFiltro,
  ConversaOrdenacao,
} from '@/hooks/useConversasPage';
import { useInsightsContato, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Conversas = () => {
  const [selectedContatoId, setSelectedContatoId] = useState<string | null>(null);
  const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false);
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
    <div className="space-y-4">
      <PageHeader
        title="Conversas"
        description="Central de mensagens do WhatsApp em tempo real"
      />

      {/* Layout de duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-220px)] border rounded-xl overflow-hidden bg-card shadow-sm">
        {/* Lista de conversas - Coluna esquerda */}
        <div className="lg:col-span-4 xl:col-span-3 border-r border-border/50 overflow-hidden">
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
        </div>

        {/* Chat - Coluna direita */}
        <div className="lg:col-span-8 xl:col-span-9 overflow-hidden hidden lg:block">
          <ChatView
            contato={contatoSelecionado}
            mensagens={mensagens}
            isLoading={loadingMensagens}
            onAnalisar={handleAnalisar}
            isAnalisando={analisarMutation.isPending}
          />
        </div>

        {/* Mobile: mostrar chat em tela cheia quando selecionado */}
        {selectedContatoId && (
          <div className="fixed inset-0 z-50 bg-background lg:hidden">
            <div className="h-full flex flex-col">
              <div className="p-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContatoId(null)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView
                  contato={contatoSelecionado}
                  mensagens={mensagens}
                  isLoading={loadingMensagens}
                  onAnalisar={handleAnalisar}
                  isAnalisando={analisarMutation.isPending}
                />
              </div>
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
    </div>
  );
};

export default Conversas;
