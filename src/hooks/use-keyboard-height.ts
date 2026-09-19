import { useEffect } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Height of the software keyboard as a shared value that animates alongside it.
 * iOS only: Android resizes the window instead, so the value stays at 0 there.
 */
export function useKeyboardHeight() {
  const height = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = Keyboard.addListener('keyboardWillChangeFrame', (e: KeyboardEvent) => {
      const visible = Math.max(0, Dimensions.get('window').height - e.endCoordinates.screenY);
      height.set(withTiming(visible, { duration: e.duration || 250, easing: Easing.out(Easing.cubic) }));
    });
    return () => sub.remove();
  }, [height]);

  return height;
}
