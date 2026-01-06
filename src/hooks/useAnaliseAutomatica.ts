import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Intervalo de processamento da fila (30 segundos)
const PROCESS_INTERVAL = 30000;

export const useAnaliseAutomatica = (enabled: boolean = true) => {
  const queryClient = useQueryClient();

  const processQueue = useCallback(async () => {
    try {
      console.log('[IA Proativa] Processando fila de análise...');
      
      const { data, error } = await supabase.functions.invoke('processar-analise-queue');
      
      if (error) {
        console.error('[IA Proativa] Erro ao processar fila:', error);
        return;
      }
      
      if (data?.processed > 0) {
        console.log(`[IA Proativa] ${data.processed} contatos analisados`);
        // Invalidar queries para atualizar UI
        queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
        queryClient.invalidateQueries({ queryKey: ['insights-conversas'] });
        queryClient.invalidateQueries({ queryKey: ['contatos-com-mensagens'] });
      }
    } catch (err) {
      console.error('[IA Proativa] Erro:', err);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    // Processar imediatamente ao montar
    const timeout = setTimeout(processQueue, 5000);
    
    // Processar periodicamente
    const interval = setInterval(processQueue, PROCESS_INTERVAL);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [enabled, processQueue]);

  return { processQueue };
};
