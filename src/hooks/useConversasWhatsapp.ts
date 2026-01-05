import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversaWhatsapp {
  id: string;
  contato_id: string | null;
  cliente_id: string | null;
  telefone: string;
  data_mensagem: string;
  remetente: 'cliente' | 'empresa';
  conteudo: string;
  tipo_midia: string | null;
  sentimento: string | null;
  intencao: string | null;
  palavras_chave: string[] | null;
  dados_extraidos: Record<string, any> | null;
  created_at: string;
}

export interface InsightsConversa {
  id: string;
  contato_id: string;
  total_mensagens: number;
  mensagens_enviadas: number;
  mensagens_recebidas: number;
  primeira_interacao: string | null;
  ultima_interacao: string | null;
  tempo_medio_resposta_minutos: number | null;
  horario_preferido: string | null;
  dia_preferido: string | null;
  sentimento_geral: string | null;
  principais_interesses: string[] | null;
  objecoes_identificadas: string[] | null;
  gatilhos_compra: string[] | null;
  score_engajamento: number;
  probabilidade_conversao: number | null;
  proxima_acao_sugerida: string | null;
  resumo_ia: string | null;
  ultima_analise: string | null;
}

export interface MensagemImportada {
  data_mensagem: string;
  remetente: 'cliente' | 'empresa';
  conteudo: string;
  tipo_midia?: string;
}

// Hook para buscar conversas de um contato
export const useConversasContato = (contatoId: string | null) => {
  return useQuery({
    queryKey: ['conversas-whatsapp', contatoId],
    queryFn: async () => {
      if (!contatoId) return [];
      
      const { data, error } = await supabase
        .from('conversas_whatsapp')
        .select('*')
        .eq('contato_id', contatoId)
        .order('data_mensagem', { ascending: true });

      if (error) throw error;
      return data as ConversaWhatsapp[];
    },
    enabled: !!contatoId,
  });
};

// Hook para buscar insights de um contato
export const useInsightsContato = (contatoId: string | null) => {
  return useQuery({
    queryKey: ['insights-conversas', contatoId],
    queryFn: async () => {
      if (!contatoId) return null;
      
      const { data, error } = await supabase
        .from('insights_conversas')
        .select('*')
        .eq('contato_id', contatoId)
        .maybeSingle();

      if (error) throw error;
      return data as InsightsConversa | null;
    },
    enabled: !!contatoId,
  });
};

// Hook para importar conversas
export const useImportarConversas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contatoId, 
      telefone, 
      mensagens,
      nomeEmpresa 
    }: { 
      contatoId: string; 
      telefone: string; 
      mensagens: MensagemImportada[];
      nomeEmpresa: string;
    }) => {
      // Preparar dados para inserção
      const conversasParaInserir = mensagens.map(msg => ({
        contato_id: contatoId,
        telefone,
        data_mensagem: msg.data_mensagem,
        remetente: msg.remetente,
        conteudo: msg.conteudo,
        tipo_midia: msg.tipo_midia || 'texto',
      }));

      // Inserir em lotes de 100
      const batchSize = 100;
      let totalInseridos = 0;

      for (let i = 0; i < conversasParaInserir.length; i += batchSize) {
        const batch = conversasParaInserir.slice(i, i + batchSize);
        const { error } = await supabase
          .from('conversas_whatsapp')
          .insert(batch);

        if (error) throw error;
        totalInseridos += batch.length;
      }

      // Atualizar contato com info de conversas
      const { error: updateError } = await supabase
        .from('contatos_inteligencia')
        .update({
          conversas_analisadas: totalInseridos,
          ultima_mensagem: mensagens[mensagens.length - 1]?.data_mensagem,
        })
        .eq('id', contatoId);

      if (updateError) throw updateError;

      return { totalInseridos };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversas-whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      toast.success(`${data.totalInseridos} mensagens importadas com sucesso!`);
    },
    onError: (error) => {
      console.error('Erro ao importar conversas:', error);
      toast.error('Erro ao importar conversas');
    },
  });
};

// Hook para analisar conversas com IA
export const useAnalisarConversas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contatoId: string) => {
      const { data, error } = await supabase.functions.invoke('analisar-conversas', {
        body: { contatoId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, contatoId) => {
      queryClient.invalidateQueries({ queryKey: ['insights-conversas', contatoId] });
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      toast.success('Análise de conversas concluída!');
    },
    onError: (error) => {
      console.error('Erro ao analisar conversas:', error);
      toast.error('Erro ao analisar conversas');
    },
  });
};

// Hook para estatísticas gerais de conversas
export const useEstatisticasConversas = () => {
  return useQuery({
    queryKey: ['estatisticas-conversas'],
    queryFn: async () => {
      // Total de conversas
      const { count: totalConversas } = await supabase
        .from('conversas_whatsapp')
        .select('*', { count: 'exact', head: true });

      // Contatos com conversas
      const { data: contatosComConversas } = await supabase
        .from('contatos_inteligencia')
        .select('id')
        .gt('conversas_analisadas', 0);

      // Insights gerados
      const { count: totalInsights } = await supabase
        .from('insights_conversas')
        .select('*', { count: 'exact', head: true });

      // Distribuição de sentimento
      const { data: sentimentos } = await supabase
        .from('insights_conversas')
        .select('sentimento_geral');

      const distribuicaoSentimento = {
        positivo: sentimentos?.filter(s => s.sentimento_geral === 'positivo').length || 0,
        neutro: sentimentos?.filter(s => s.sentimento_geral === 'neutro').length || 0,
        negativo: sentimentos?.filter(s => s.sentimento_geral === 'negativo').length || 0,
      };

      return {
        totalConversas: totalConversas || 0,
        contatosComConversas: contatosComConversas?.length || 0,
        totalInsights: totalInsights || 0,
        distribuicaoSentimento,
      };
    },
  });
};
