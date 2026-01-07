/**
 * Hook para feedback sonoro e háptico no scanner de código de barras
 * Usa Web Audio API para gerar sons sem arquivos externos
 */

import { useHapticFeedback } from './useHapticFeedback';

type FeedbackType = 'success' | 'error' | 'warning' | 'confirm';

export function useScannerFeedback() {
  const haptic = useHapticFeedback();

  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      // Fade out para som mais suave
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
      
      // Limpar contexto após uso
      setTimeout(() => ctx.close(), duration * 1000 + 100);
    } catch (error) {
      console.warn('[ScannerFeedback] Audio playback failed:', error);
    }
  };

  const playSuccessBeep = () => {
    // Tom agudo = sucesso (1200Hz, curto)
    playTone(1200, 0.1, 'sine');
  };

  const playErrorBuzz = () => {
    // Tom grave = erro (200Hz, mais longo)
    playTone(200, 0.3, 'square');
  };

  const playWarningTone = () => {
    // Tom médio = atenção (600Hz)
    playTone(600, 0.15, 'triangle');
  };

  const playConfirmBeep = () => {
    // Duplo bip para confirmação
    playTone(1200, 0.08, 'sine');
    setTimeout(() => playTone(1400, 0.1, 'sine'), 120);
  };

  const feedback = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        playSuccessBeep();
        haptic.success();
        break;
      case 'error':
        playErrorBuzz();
        haptic.error();
        break;
      case 'warning':
        playWarningTone();
        haptic.warning();
        break;
      case 'confirm':
        playConfirmBeep();
        haptic.heavy();
        break;
    }
  };

  return {
    playSuccessBeep,
    playErrorBuzz,
    playWarningTone,
    playConfirmBeep,
    feedback,
    haptic,
  };
}
