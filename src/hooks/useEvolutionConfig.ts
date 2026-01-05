import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface EvolutionStatus {
  configured: boolean;
  status: 'conectado' | 'desconectado' | 'qrcode' | 'conectando';
  instanceName?: string;
  numeroConectado?: string;
  qrcode?: string;
  ultimaSincronizacao?: string;
  totalMensagens?: number;
  totalContatos?: number;
  error?: string;
}

export interface EvolutionConfig {
  instanceName: string;
  apiUrl: string;
  apiKey: string;
}

// Hook para buscar status da Evolution
export const useEvolutionStatus = () => {
  return useQuery({
    queryKey: ['evolution-status'],
    queryFn: async (): Promise<EvolutionStatus> => {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: { action: 'status' },
      });

      if (error) throw error;
      return data as EvolutionStatus;
    },
    refetchInterval: (query) => {
      // Refetch mais frequente quando aguardando QR code
      const data = query.state.data as EvolutionStatus | undefined;
      if (data?.status === 'qrcode' || data?.status === 'conectando') {
        return 3000; // 3 segundos
      }
      return 30000; // 30 segundos normalmente
    },
  });
};

// Hook para salvar configuração
export const useSaveEvolutionConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: EvolutionConfig) => {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: {
          action: 'save-config',
          instanceName: config.instanceName,
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar config:', error);
      toast.error('Erro ao salvar configuração');
    },
  });
};

// Hook para conectar/criar instância
export const useConnectEvolution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceName?: string) => {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: { action: 'create', instanceName },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
      if (data.status === 'qrcode') {
        toast.info('Escaneie o QR Code para conectar');
      } else if (data.status === 'conectado') {
        toast.success('WhatsApp conectado!');
      }
    },
    onError: (error) => {
      console.error('Erro ao conectar:', error);
      toast.error('Erro ao conectar com Evolution API');
    },
  });
};

// Hook para desconectar
export const useDisconnectEvolution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceName?: string) => {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: { action: 'disconnect', instanceName },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
      toast.success('WhatsApp desconectado');
    },
    onError: (error) => {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar');
    },
  });
};

// Hook para sincronizar dados
export const useSyncEvolution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: 'contacts' | 'messages' | 'full') => {
      const { data, error } = await supabase.functions.invoke('evolution-sync', {
        body: { action },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-conversas'] });
      
      const { results } = data;
      if (results.contacts.total > 0 || results.messages.total > 0) {
        toast.success(
          `Sincronização concluída: ${results.contacts.created} contatos, ${results.messages.created} mensagens`
        );
      } else {
        toast.info('Nenhum dado novo para sincronizar');
      }
    },
    onError: (error) => {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar dados');
    },
  });
};

// Hook para deletar configuração
export const useDeleteEvolutionConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceName?: string) => {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: { action: 'delete', instanceName },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
      toast.success('Configuração removida');
    },
    onError: (error) => {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao remover configuração');
    },
  });
};

// Hook para realtime de novas mensagens
export const useConversasRealtime = (onNewMessage?: (payload: any) => void) => {
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
          console.log('[Realtime] Nova mensagem:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversas-whatsapp'] });
          queryClient.invalidateQueries({ queryKey: ['estatisticas-conversas'] });
          queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
          onNewMessage?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, onNewMessage]);
};
