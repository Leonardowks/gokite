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
  ultima_mensagem: string | null;
  ultima_mensagem_texto: string | null;
  ultima_mensagem_remetente: string | null;
  nao_lidas: number;
}

export interface MensagemChat {
  id: string;
  contato_id: string | null;
  telefone: string;
  data_mensagem: string;
  remetente: string;
  conteudo: string;
  tipo_midia: string | null;
  lida: boolean;
  is_from_me: boolean | null;
  push_name: string | null;
  message_status: string | null;
}

// Hook para buscar lista de contatos com última mensagem
export const useContatosComMensagens = () => {
  return useQuery({
    queryKey: ['contatos-com-mensagens'],
    queryFn: async () => {
      // Buscar contatos que têm conversas
      const { data: contatos, error: contatosError } = await supabase
        .from('contatos_inteligencia')
        .select('id, nome, telefone, whatsapp_profile_picture, whatsapp_profile_name, status, prioridade, ultima_mensagem')
        .not('ultima_mensagem', 'is', null)
        .order('ultima_mensagem', { ascending: false });

      if (contatosError) throw contatosError;
      if (!contatos || contatos.length === 0) return [];

      // Para cada contato, buscar última mensagem e contagem de não lidas
      const contatosComDetalhes = await Promise.all(
        contatos.map(async (contato) => {
          // Última mensagem
          const { data: ultimaMsg } = await supabase
            .from('conversas_whatsapp')
            .select('conteudo, remetente, is_from_me')
            .eq('contato_id', contato.id)
            .order('data_mensagem', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Contagem de não lidas
          const { count: naoLidas } = await supabase
            .from('conversas_whatsapp')
            .select('*', { count: 'exact', head: true })
            .eq('contato_id', contato.id)
            .eq('lida', false)
            .eq('is_from_me', false);

          const remetente = ultimaMsg?.is_from_me ? 'empresa' : 'cliente';

          return {
            ...contato,
            ultima_mensagem_texto: ultimaMsg?.conteudo || null,
            ultima_mensagem_remetente: remetente,
            nao_lidas: naoLidas || 0,
          } as ContatoComUltimaMensagem;
        })
      );

      return contatosComDetalhes;
    },
    refetchInterval: 30000, // Refresh a cada 30s
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
        .select('id, contato_id, telefone, data_mensagem, remetente, conteudo, tipo_midia, lida, is_from_me, push_name, message_status')
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
    refetchInterval: 10000, // Refresh a cada 10s
  });
};

// Hook para realtime de novas mensagens
export const useConversasRealtime = (onNovaMensagem?: (mensagem: any) => void) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('conversas-realtime')
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
          queryClient.invalidateQueries({ queryKey: ['mensagens-chat'] });

          // Callback customizado
          if (onNovaMensagem && payload.new) {
            onNovaMensagem(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
