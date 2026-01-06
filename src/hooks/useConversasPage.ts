import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContatoComUltimaMensagem {
  id: string;
  nome: string | null;
  telefone: string;
  whatsapp_profile_picture: string | null;
  whatsapp_profile_name: string | null;
  status: string | null;
  prioridade: string | null;
  is_business: boolean | null;
  business_name: string | null;
  score_interesse: number | null;
  ultima_mensagem: string | null;
  ultima_mensagem_texto: string | null;
  ultima_mensagem_tipo_midia: string | null;
  ultima_mensagem_is_from_me: boolean | null;
  nao_lidas: number;
  // Campos adicionais para o drawer
  interesse_principal: string | null;
  dores_identificadas: string[] | null;
  gatilhos: string[] | null;
  objecoes: string[] | null;
  resumo_ia: string | null;
  engajamento_score: number | null;
  conversas_analisadas: number | null;
  ultimo_contato: string | null;
  created_at: string | null;
  // Campos de insights comerciais
  proxima_acao_sugerida: string | null;
  probabilidade_conversao: number | null;
  sentimento_geral: string | null;
  // Status de análise IA
  analise_status: 'pendente' | 'processando' | 'recente' | null;
  classificado_em: string | null;
}

export interface MensagemChat {
  id: string;
  contato_id: string | null;
  telefone: string;
  data_mensagem: string;
  remetente: string;
  conteudo: string;
  tipo_midia: string | null;
  media_url: string | null;
  media_mimetype: string | null;
  lida: boolean;
  is_from_me: boolean | null;
  push_name: string | null;
  message_status: string | null;
  message_id: string | null;
}

export type ConversaFiltro = 'todos' | 'nao_lidos' | 'leads' | 'clientes';
export type ConversaOrdenacao = 'recentes' | 'nao_lidos' | 'nome';

// Hook otimizado para buscar lista de contatos com última mensagem
export const useContatosComMensagens = (filtro: ConversaFiltro = 'todos', ordenacao: ConversaOrdenacao = 'recentes') => {
  return useQuery({
    queryKey: ['contatos-com-mensagens', filtro, ordenacao],
    queryFn: async () => {
      // Query otimizada: buscar contatos e suas mensagens em uma única chamada
      const { data: contatos, error: contatosError } = await supabase
        .from('contatos_inteligencia')
        .select(`
          id, 
          nome, 
          telefone, 
          whatsapp_profile_picture, 
          whatsapp_profile_name, 
          status, 
          prioridade,
          is_business,
          business_name,
          score_interesse,
          ultima_mensagem,
          interesse_principal,
          dores_identificadas,
          gatilhos,
          objecoes,
          resumo_ia,
          engajamento_score,
          conversas_analisadas,
          ultimo_contato,
          created_at,
          classificado_em
        `)
        .not('ultima_mensagem', 'is', null)
        .order('ultima_mensagem', { ascending: false });

      if (contatosError) throw contatosError;
      if (!contatos || contatos.length === 0) return [];

      // Buscar todas as últimas mensagens e contagens em batch
      const contatoIds = contatos.map(c => c.id);
      
      // Buscar status de análise IA na fila
      const { data: analiseQueueData } = await supabase
        .from('analise_queue')
        .select('contato_id, status')
        .in('contato_id', contatoIds)
        .in('status', ['pendente', 'processando']);
      
      // Buscar insights de todos os contatos
      const { data: insightsData } = await supabase
        .from('insights_conversas')
        .select('contato_id, proxima_acao_sugerida, probabilidade_conversao, sentimento_geral')
        .in('contato_id', contatoIds);
      
      // Buscar últimas mensagens de todos os contatos
      const { data: ultimasMensagens } = await supabase
        .from('conversas_whatsapp')
        .select('contato_id, conteudo, is_from_me, tipo_midia, data_mensagem')
        .in('contato_id', contatoIds)
        .order('data_mensagem', { ascending: false });

      // Buscar contagem de não lidas
      const { data: naoLidasData } = await supabase
        .from('conversas_whatsapp')
        .select('contato_id')
        .in('contato_id', contatoIds)
        .eq('lida', false)
        .eq('is_from_me', false);

      // Criar maps para lookup rápido
      const ultimaMsgMap = new Map<string, typeof ultimasMensagens[0]>();
      ultimasMensagens?.forEach(msg => {
        if (!ultimaMsgMap.has(msg.contato_id!)) {
          ultimaMsgMap.set(msg.contato_id!, msg);
        }
      });

      const naoLidasMap = new Map<string, number>();
      naoLidasData?.forEach(item => {
        const count = naoLidasMap.get(item.contato_id!) || 0;
        naoLidasMap.set(item.contato_id!, count + 1);
      });

      const insightsMap = new Map<string, typeof insightsData[0]>();
      insightsData?.forEach(insight => {
        if (insight.contato_id) {
          insightsMap.set(insight.contato_id, insight);
        }
      });

      // Criar map para status de análise IA
      const analiseQueueMap = new Map<string, 'pendente' | 'processando'>();
      analiseQueueData?.forEach(item => {
        if (item.contato_id) {
          analiseQueueMap.set(item.contato_id, item.status as 'pendente' | 'processando');
        }
      });

      // Determinar status de análise IA para cada contato
      const getAnaliseStatus = (contatoId: string, classificadoEm: string | null): 'pendente' | 'processando' | 'recente' | null => {
        const queueStatus = analiseQueueMap.get(contatoId);
        if (queueStatus) return queueStatus;
        
        // Verificar se foi classificado recentemente (últimos 5 minutos)
        if (classificadoEm) {
          const diff = Date.now() - new Date(classificadoEm).getTime();
          if (diff < 5 * 60 * 1000) return 'recente';
        }
        return null;
      };

      // Montar resultado
      let resultado = contatos.map(contato => {
        const ultimaMsg = ultimaMsgMap.get(contato.id);
        const naoLidas = naoLidasMap.get(contato.id) || 0;
        const insights = insightsMap.get(contato.id);

        return {
          ...contato,
          ultima_mensagem_texto: ultimaMsg?.conteudo || null,
          ultima_mensagem_tipo_midia: ultimaMsg?.tipo_midia || null,
          ultima_mensagem_is_from_me: ultimaMsg?.is_from_me || null,
          nao_lidas: naoLidas,
          proxima_acao_sugerida: insights?.proxima_acao_sugerida || null,
          probabilidade_conversao: insights?.probabilidade_conversao || null,
          sentimento_geral: insights?.sentimento_geral || null,
          analise_status: getAnaliseStatus(contato.id, contato.classificado_em),
        } as ContatoComUltimaMensagem;
      });

      // Aplicar filtros
      if (filtro === 'nao_lidos') {
        resultado = resultado.filter(c => c.nao_lidas > 0);
      } else if (filtro === 'leads') {
        resultado = resultado.filter(c => c.status === 'lead' || c.status === 'lead_quente');
      } else if (filtro === 'clientes') {
        resultado = resultado.filter(c => c.status === 'cliente_ativo' || c.status === 'cliente_inativo');
      }

      // Aplicar ordenação
      if (ordenacao === 'nao_lidos') {
        resultado.sort((a, b) => b.nao_lidas - a.nao_lidas);
      } else if (ordenacao === 'nome') {
        resultado.sort((a, b) => {
          const nomeA = a.whatsapp_profile_name || a.nome || a.telefone;
          const nomeB = b.whatsapp_profile_name || b.nome || b.telefone;
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });
      }
      // 'recentes' já está ordenado pela query

      return resultado;
    },
    refetchInterval: 30000,
  });
};

// Hook para buscar mensagens de um contato específico
export const useMensagensContato = (contatoId: string | null) => {
  return useQuery({
    queryKey: ['mensagens-chat', contatoId],
    queryFn: async () => {
      if (!contatoId) return [];

      const { data, error } = await supabase
        .from('conversas_whatsapp')
        .select('id, contato_id, telefone, data_mensagem, remetente, conteudo, tipo_midia, media_url, media_mimetype, lida, is_from_me, push_name, message_status, message_id')
        .eq('contato_id', contatoId)
        .order('data_mensagem', { ascending: true });

      if (error) throw error;
      return (data || []) as MensagemChat[];
    },
    enabled: !!contatoId,
  });
};

// Hook para marcar mensagens como lidas
export const useMarcarComoLida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contatoId: string) => {
      const { error } = await supabase
        .from('conversas_whatsapp')
        .update({ lida: true })
        .eq('contato_id', contatoId)
        .eq('lida', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
    },
  });
};

// Hook para contar mensagens não lidas total
export const useMensagensNaoLidas = () => {
  return useQuery({
    queryKey: ['mensagens-nao-lidas'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('conversas_whatsapp')
        .select('*', { count: 'exact', head: true })
        .eq('lida', false)
        .eq('is_from_me', false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 10000,
  });
};

// Função auxiliar para ordenar mensagens cronologicamente
const sortMessagesByTimestamp = (messages: MensagemChat[]): MensagemChat[] => {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.data_mensagem).getTime();
    const timeB = new Date(b.data_mensagem).getTime();
    if (timeA !== timeB) return timeA - timeB;
    // Desempate por id se timestamps iguais
    return a.id.localeCompare(b.id);
  });
};

// Função para merge de mensagens removendo duplicatas e ordenando
const mergeAndSortMessages = (existing: MensagemChat[], newMessage: MensagemChat): MensagemChat[] => {
  // Verificar duplicata por id ou message_id
  const isDuplicate = existing.some(m => 
    m.id === newMessage.id || 
    (m.message_id && newMessage.message_id && m.message_id === newMessage.message_id)
  );
  
  if (isDuplicate) return existing;
  
  // Adicionar e ordenar cronologicamente
  return sortMessagesByTimestamp([...existing, newMessage]);
};

// Hook para realtime de novas mensagens e atualizações de status
export const useConversasRealtime = (onNovaMensagem?: (mensagem: any) => void) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Canal para INSERT (novas mensagens)
    const insertChannel = supabase
      .channel('conversas-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversas_whatsapp',
        },
        (payload) => {
          console.log('[Realtime] Nova mensagem:', payload.new);
          
          // Invalidar queries
          queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
          queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
          
          // Atualizar cache de mensagens com merge ordenado cronologicamente
          const newMessage = payload.new as MensagemChat;
          if (newMessage.contato_id) {
            queryClient.setQueryData(
              ['mensagens-chat', newMessage.contato_id],
              (old: MensagemChat[] | undefined) => {
                if (!old) return [newMessage];
                return mergeAndSortMessages(old, newMessage);
              }
            );
          }

          // Callback customizado
          if (onNovaMensagem && payload.new) {
            onNovaMensagem(payload.new);
          }
        }
      )
      .subscribe();

    // Canal para UPDATE (status de mensagens)
    const updateChannel = supabase
      .channel('conversas-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversas_whatsapp',
        },
        (payload) => {
          console.log('[Realtime] Mensagem atualizada:', payload.new);
          
          // Atualizar cache de mensagens com novo status e reordenar
          const updatedMessage = payload.new as MensagemChat;
          if (updatedMessage.contato_id) {
            queryClient.setQueryData(
              ['mensagens-chat', updatedMessage.contato_id],
              (old: MensagemChat[] | undefined) => {
                if (!old) return old;
                const updated = old.map(m => 
                  m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
                );
                // Reordenar caso data_mensagem tenha mudado
                return sortMessagesByTimestamp(updated);
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [queryClient, onNovaMensagem]);
};

// Hook para buscar contato por ID
export const useContatoById = (contatoId: string | null) => {
  return useQuery({
    queryKey: ['contato', contatoId],
    queryFn: async () => {
      if (!contatoId) return null;

      const { data, error } = await supabase
        .from('contatos_inteligencia')
        .select('*')
        .eq('id', contatoId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!contatoId,
  });
};

// Hook para enviar mensagem via Evolution API
export const useEnviarMensagem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contatoId, 
      mensagem,
      mediaUrl,
      mediaType,
      fileName,
      caption,
    }: { 
      contatoId: string; 
      mensagem?: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'audio' | 'video' | 'document';
      fileName?: string;
      caption?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { contatoId, mensagem, mediaUrl, mediaType, fileName, caption },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['mensagens-chat', variables.contatoId] });
      queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
    },
    onError: (error: Error) => {
      console.error('[useEnviarMensagem] Erro:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
    },
  });
};

// Hook para upload de mídia para o bucket
export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async ({ file, contatoId }: { file: File; contatoId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contatoId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(data.path);

      // Determinar tipo de mídia
      let mediaType: 'image' | 'audio' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      else if (file.type.startsWith('video/')) mediaType = 'video';

      return {
        url: urlData.publicUrl,
        mediaType,
        fileName: file.name,
      };
    },
    onError: (error: Error) => {
      console.error('[useUploadMedia] Erro:', error);
      toast.error('Erro ao fazer upload do arquivo');
    },
  });
};

// ========== HOOK: Importar Histórico ==========
export const useImportarHistorico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contatoId, phone, limit = 100 }: { contatoId?: string; phone?: string; limit?: number }) => {
      console.log('[useImportarHistorico] Importando...', { contatoId, phone, limit });
      
      const { data, error } = await supabase.functions.invoke('import-history', {
        body: { contato_id: contatoId, phone, limit },
      });

      if (error) {
        console.error('[useImportarHistorico] Erro:', error);
        throw new Error(error.message || 'Erro ao importar histórico');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('[useImportarHistorico] Sucesso:', data);
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['mensagens-chat'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
      
      if (data?.mensagens_importadas > 0) {
        toast.success(`${data.mensagens_importadas} mensagens importadas!`);
      } else if (data?.mensagens_duplicadas > 0) {
        toast.info('Todas as mensagens já estavam sincronizadas');
      } else {
        toast.info('Nenhuma mensagem encontrada para importar');
      }
    },
    onError: (error: Error) => {
      console.error('[useImportarHistorico] Erro:', error);
      toast.error(error.message || 'Erro ao importar histórico');
    },
  });
};

// ========== HOOK: Sincronizar Base Completa ==========
export const useSincronizarBaseCompleta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action = 'contacts' }: { action?: 'contacts' | 'messages' | 'full' } = {}) => {
      console.log('[useSincronizarBaseCompleta] Iniciando sincronização...', action);
      
      const { data, error } = await supabase.functions.invoke('evolution-sync', {
        body: { action },
      });

      if (error) {
        console.error('[useSincronizarBaseCompleta] Erro:', error);
        throw new Error(error.message || 'Erro ao sincronizar');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('[useSincronizarBaseCompleta] Sucesso:', data);
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      
      const stats = data?.stats || {};
      toast.success(
        `Sincronização concluída! ${stats.contatos_criados || 0} novos, ${stats.contatos_atualizados || 0} atualizados`,
        { duration: 5000 }
      );
    },
    onError: (error: Error) => {
      console.error('[useSincronizarBaseCompleta] Erro:', error);
      toast.error(error.message || 'Erro ao sincronizar base');
    },
  });
};
