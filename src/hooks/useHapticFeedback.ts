/**
 * Hook para feedback háptico (vibração) em dispositivos móveis
 * Usa a Navigator Vibration API
 */

type HapticPattern = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy';

const patterns: Record<HapticPattern, number | number[]> = {
  success: [50, 30, 50], // Dupla vibração curta
  error: [100, 50, 100, 50, 100], // Tripla vibração longa
  warning: [80, 40, 80], // Dupla vibração média
  light: 10, // Vibração muito leve
  medium: 30, // Vibração média
  heavy: 50, // Vibração forte
};

export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = (pattern: HapticPattern | number | number[] = 'medium') => {
    if (!isSupported) return false;

    try {
      const vibrationPattern = typeof pattern === 'string' 
        ? patterns[pattern] 
        : pattern;
      
      return navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn('[Haptic] Vibration failed:', error);
      return false;
    }
  };

  const success = () => vibrate('success');
  const error = () => vibrate('error');
  const warning = () => vibrate('warning');
  const light = () => vibrate('light');
  const medium = () => vibrate('medium');
  const heavy = () => vibrate('heavy');

  return {
    isSupported,
    vibrate,
    success,
    error,
    warning,
    light,
    medium,
    heavy,
  };
}
