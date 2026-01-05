import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

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

export interface SyncJob {
  id: string;
  tipo: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'erro' | 'cancelado';
  progresso_atual: number;
  progresso_total: number;
  chats_processados: number;
  contatos_criados: number;
  contatos_atualizados: number;
  mensagens_criadas: number;
  mensagens_puladas: number;
  erros: number;
  logs: string[];
  resultado?: Record<string, any>;
  erro?: string;
  iniciado_em?: string;
  concluido_em?: string;
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
      const data = query.state.data as EvolutionStatus | undefined;
      if (data?.status === 'qrcode' || data?.status === 'conectando') {
        return 3000;
      }
      return 30000;
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

// Hook para sincronizar dados - retorna jobId para tracking
export const useSyncEvolution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: 'contacts' | 'messages' | 'full') => {
      const { data, error } = await supabase.functions.invoke('evolution-sync', {
        body: { action },
      });

      if (error) throw error;
      return data as { success: boolean; jobId: string; results?: any; duration?: number };
    },
    onSuccess: (data) => {
      // Não invalidar queries aqui - deixar o realtime fazer isso
      if (data.jobId) {
        toast.info('Sincronização iniciada. Acompanhe o progresso abaixo.');
      }
    },
    onError: (error) => {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao iniciar sincronização');
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

// Hook para acompanhar progresso de sync em tempo real
export const useSyncProgress = (jobId: string | null) => {
  const [job, setJob] = useState<SyncJob | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    // Buscar job inicial
    const fetchJob = async () => {
      const { data } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (data) {
        setJob(data as SyncJob);
      }
    };

    fetchJob();

    // Subscrever para atualizações em tempo real
    const channel = supabase
      .channel(`sync-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[SyncProgress] Atualização recebida:', payload);
          setJob(payload.new as SyncJob);
          
          // Se completou, invalidar queries
          if (payload.new.status === 'concluido' || payload.new.status === 'erro') {
            queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
            queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
            queryClient.invalidateQueries({ queryKey: ['conversas-whatsapp'] });
            
            if (payload.new.status === 'concluido') {
              toast.success(
                `Sincronização concluída: ${payload.new.contatos_criados + payload.new.contatos_atualizados} contatos, ${payload.new.mensagens_criadas} mensagens`
              );
            } else {
              toast.error(`Erro na sincronização: ${payload.new.erro}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);

  return job;
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
