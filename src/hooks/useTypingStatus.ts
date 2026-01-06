import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingStatus {
  phone: string;
  presence: 'composing' | 'recording' | 'available' | 'unavailable';
  timestamp: string;
}

/**
 * Hook para escutar status de "digitando..." via Supabase Realtime Broadcast
 * @param phone - Telefone do contato para monitorar (opcional, se não passar monitora todos)
 */
export const useTypingStatus = (phone?: string) => {
  const [typingStatus, setTypingStatus] = useState<TypingStatus | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('typing-status');

    channel
      .on('broadcast', { event: 'presence' }, (payload) => {
        const data = payload.payload as TypingStatus;
        
        // Se um telefone específico foi passado, filtra
        if (phone && data.phone !== phone) return;
        
        setTypingStatus(data);
        
        // Define isTyping baseado no presence
        const isTypingNow = data.presence === 'composing' || data.presence === 'recording';
        setIsTyping(isTypingNow);
        
        // Auto-limpa após 5 segundos (fallback caso não receba 'available')
        if (isTypingNow) {
          const timeout = setTimeout(() => {
            setIsTyping(false);
            setTypingStatus(null);
          }, 5000);
          
          return () => clearTimeout(timeout);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phone]);

  return { isTyping, typingStatus };
};
