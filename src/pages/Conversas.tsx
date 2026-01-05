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
  useContatoById,
} from '@/hooks/useConversasPage';
import { useInsightsContato, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';

const Conversas = () => {
  const [selectedContatoId, setSelectedContatoId] = useState<string | null>(null);
  const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false);

  // Queries
  const { data: contatos = [], isLoading: loadingContatos, refetch: refetchContatos } = useContatosComMensagens();
  const { data: mensagens = [], isLoading: loadingMensagens } = useMensagensContato(selectedContatoId);
  const { data: insights, isLoading: loadingInsights } = useInsightsContato(selectedContatoId);

  // Mutations
  const marcarComoLidaMutation = useMarcarComoLida();
  const analisarMutation = useAnalisarConversas();

  // Contato selecionado
  const contatoSelecionado = contatos.find((c) => c.id === selectedContatoId) || null;

  // Realtime
  const handleNovaMensagem = useCallback((mensagem: any) => {
    // Mostrar toast de nova mensagem se não for da nossa parte
    if (!mensagem.is_from_me) {
      const contato = contatos.find(c => c.id === mensagem.contato_id);
      toast.info(
        `Nova mensagem de ${contato?.nome || contato?.whatsapp_profile_name || 'Contato'}`,
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
              <div className="p-4 border-b flex items-center gap-3">
                <button
                  onClick={() => setSelectedContatoId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Voltar
                </button>
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
