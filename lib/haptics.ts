// Haptic feedback utility for mobile devices
// Uses the Vibration API (works on Android, graceful fallback on iOS)

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(30);
        break;
      case 'success':
        navigator.vibrate([10, 50, 10]);
        break;
      case 'error':
        navigator.vibrate([20, 30, 20]);
        break;
      case 'selection':
        navigator.vibrate(5);
        break;
    }
  }
};