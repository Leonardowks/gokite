import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EvolutionHealthStatus {
  connected: boolean;
  apiReachable: boolean;
  webhookConfigured: boolean;
  lastSync: string | null;
  lastMessage: string | null;
  messageGap: number | null;
  issues: string[];
  recommendations: string[];
}

// Hook para monitorar saúde da Evolution e polling fallback
export function useEvolutionHealth(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const lastPollRef = useRef<number>(0);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar saúde da conexão
  const checkHealth = useCallback(async (): Promise<EvolutionHealthStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-health');
      
      if (error) {
        console.error('[useEvolutionHealth] Erro:', error);
        return null;
      }
      
      return data as EvolutionHealthStatus;
    } catch (err) {
      console.error('[useEvolutionHealth] Erro ao verificar saúde:', err);
      return null;
    }
  }, []);

  // Reconfigurar webhook
  const reconfigureWebhook = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: { action: 'reconfigure-webhook' },
      });
      
      if (error) throw error;
      
      console.log('[useEvolutionHealth] Webhook reconfigurado:', data);
      return data;
    } catch (err) {
      console.error('[useEvolutionHealth] Erro ao reconfigurar webhook:', err);
      throw err;
    }
  }, []);

  // Polling de mensagens como fallback
  const pollMessages = useCallback(async (contatoId?: string) => {
    try {
      const now = Date.now();
      // Evitar polling muito frequente
      if (now - lastPollRef.current < 5000) return;
      lastPollRef.current = now;

      const { data, error } = await supabase.functions.invoke('evolution-poll', {
        body: { contatoId, limit: 50 },
      });

      if (error) {
        console.error('[useEvolutionHealth] Erro no poll:', error);
        return;
      }

      if (data.novas > 0 || data.atualizadas > 0) {
        console.log(`[useEvolutionHealth] Poll: ${data.novas} novas, ${data.atualizadas} atualizadas`);
        // Invalidar queries com as keys corretas para atualizar UI
        queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
        queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
        
        // Invalidar mensagens do contato específico ou todas
        if (contatoId) {
          queryClient.invalidateQueries({ queryKey: ['mensagens-chat', contatoId] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['mensagens-chat'] });
        }
      }
    } catch (err) {
      console.error('[useEvolutionHealth] Erro no polling:', err);
    }
  }, [queryClient]);

  // Configurar polling inteligente (menos agressivo para não bagunçar cronologia)
  useEffect(() => {
    if (!enabled) return;

    // Health check a cada 60 segundos
    const runHealthCheck = async () => {
      const health = await checkHealth();
      
      if (health && health.connected && !health.webhookConfigured) {
        console.log('[useEvolutionHealth] Webhook não configurado, tentando reconfigurar...');
        try {
          await reconfigureWebhook();
        } catch (err) {
          console.error('[useEvolutionHealth] Falha ao reconfigurar webhook');
        }
      }
      
      // Só fazer poll automático se:
      // 1. Há um gap de mensagens > 5 minutos (era 2, aumentado para reduzir polling)
      // 2. OU webhook não está configurado
      const shouldPoll = health && health.connected && (
        !health.webhookConfigured || 
        (health.messageGap && health.messageGap > 5)
      );
      
      if (shouldPoll) {
        console.log('[useEvolutionHealth] Gap significativo ou sem webhook, fazendo poll...');
        await pollMessages();
      }
    };

    // Executar imediatamente e depois a cada 90 segundos (era 60)
    runHealthCheck();
    healthCheckIntervalRef.current = setInterval(runHealthCheck, 90000);

    // REMOVIDO: Polling global a cada 30s era muito agressivo e causava reordenações
    // O polling agora só acontece baseado no health check

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled, checkHealth, reconfigureWebhook, pollMessages]);

  return {
    checkHealth,
    reconfigureWebhook,
    pollMessages,
  };
}

// Hook para polling específico de um contato (menos agressivo)
export function useContatoPolling(contatoId: string | null, enabled: boolean = true) {
  const { pollMessages } = useEvolutionHealth(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !contatoId) return;

    // Poll a cada 30 segundos quando visualizando uma conversa (era 15s)
    const poll = () => pollMessages(contatoId);
    
    // Poll inicial com delay maior para evitar duplicação com webhook
    const timeout = setTimeout(poll, 5000);
    intervalRef.current = setInterval(poll, 30000);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [contatoId, enabled, pollMessages]);
}
