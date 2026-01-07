/**
 * Hook para feedback sonoro e háptico no scanner de código de barras
 * Usa Web Audio API para gerar sons sem arquivos externos
 * Sons mais sofisticados e padrões de vibração diferenciados
 */

import { useCallback } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

type FeedbackType = 'success' | 'error' | 'warning' | 'confirm' | 'scan';

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export function useScannerFeedback() {
  const haptic = useHapticFeedback();

  const playTone = useCallback((
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine',
    volume: number = 0.3
  ) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      // Attack and decay envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn('[ScannerFeedback] Audio playback failed:', error);
    }
  }, []);

  const playSuccessBeep = useCallback(() => {
    // Tom agudo duplo = sucesso (mais musical)
    playTone(880, 0.1, 'sine', 0.25);
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.3), 100);
  }, [playTone]);

  const playErrorBuzz = useCallback(() => {
    // Tom grave = erro (200Hz, mais longo, com vibrato)
    playTone(200, 0.25, 'square', 0.2);
    setTimeout(() => playTone(180, 0.15, 'square', 0.15), 200);
  }, [playTone]);

  const playWarningTone = useCallback(() => {
    // Tom médio descendente = atenção
    playTone(600, 0.1, 'triangle', 0.2);
    setTimeout(() => playTone(500, 0.15, 'triangle', 0.2), 120);
  }, [playTone]);

  const playConfirmChime = useCallback(() => {
    // Melodia de 3 notas para confirmação (cha-ching!)
    playTone(800, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(1000, 0.08, 'sine', 0.25), 80);
    setTimeout(() => playTone(1200, 0.15, 'sine', 0.3), 160);
  }, [playTone]);

  const playScanTick = useCallback(() => {
    // Tick sutil para indicar que está escaneando
    playTone(2000, 0.02, 'sine', 0.1);
  }, [playTone]);

  const playDetectionBeep = useCallback(() => {
    // Beep curto quando detecta algo
    playTone(1400, 0.05, 'sine', 0.15);
  }, [playTone]);

  const feedback = useCallback((type: FeedbackType) => {
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
        playConfirmChime();
        haptic.heavy();
        break;
      case 'scan':
        playScanTick();
        haptic.light();
        break;
    }
  }, [playSuccessBeep, playErrorBuzz, playWarningTone, playConfirmChime, playScanTick, haptic]);

  return {
    playSuccessBeep,
    playErrorBuzz,
    playWarningTone,
    playConfirmChime: playConfirmChime,
    playScanTick,
    playDetectionBeep,
    feedback,
    haptic,
  };
}
