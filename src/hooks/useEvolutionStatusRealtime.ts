import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionStatus = 'conectado' | 'desconectado' | 'qrcode' | 'conectando';

export interface EvolutionRealtimeStatus {
  status: ConnectionStatus;
  qrcode_base64?: string | null;
  numero_conectado?: string | null;
  instance_name?: string;
}

/**
 * Hook para monitorar status da Evolution API em tempo real
 * Escuta mudanças na tabela evolution_config via Supabase Realtime
 */
export function useEvolutionStatusRealtime() {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<EvolutionRealtimeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Buscar status inicial
    const fetchInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('evolution_config')
          .select('status, qrcode_base64, numero_conectado, instance_name')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[EvolutionRealtime] Erro ao buscar status:', error);
          setRealtimeStatus({ status: 'desconectado' });
        } else if (data) {
          setRealtimeStatus({
            status: (data.status as ConnectionStatus) || 'desconectado',
            qrcode_base64: data.qrcode_base64,
            numero_conectado: data.numero_conectado,
            instance_name: data.instance_name,
          });
        } else {
          // Sem configuração = desconectado
          setRealtimeStatus({ status: 'desconectado' });
        }
      } catch (err) {
        console.error('[EvolutionRealtime] Erro:', err);
        setRealtimeStatus({ status: 'desconectado' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();

    // Subscrever para mudanças em tempo real
    const channel = supabase
      .channel('evolution-config-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'evolution_config',
        },
        (payload) => {
          console.log('[EvolutionRealtime] Mudança detectada:', payload);
          
          if (payload.eventType === 'DELETE') {
            setRealtimeStatus({ status: 'desconectado' });
          } else {
            const newData = payload.new as any;
            const newStatus: ConnectionStatus = newData.status || 'desconectado';
            
            setRealtimeStatus({
              status: newStatus,
              qrcode_base64: newData.qrcode_base64,
              numero_conectado: newData.numero_conectado,
              instance_name: newData.instance_name,
            });

            // Invalidar queries quando conectar para carregar dados
            if (newStatus === 'conectado') {
              console.log('[EvolutionRealtime] Conectado! Atualizando dados...');
              queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
              queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
              queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[EvolutionRealtime] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const isConnected = realtimeStatus?.status === 'conectado';

  return {
    status: realtimeStatus?.status ?? 'desconectado',
    isConnected,
    isLoading,
    qrcode: realtimeStatus?.qrcode_base64,
    numeroConectado: realtimeStatus?.numero_conectado,
    instanceName: realtimeStatus?.instance_name,
  };
}
