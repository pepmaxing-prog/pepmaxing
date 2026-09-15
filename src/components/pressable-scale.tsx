import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. */
  pressedScale?: number;
};

/** Pressable with the springy scale feedback used across the app. */
export function PressableScale({ style, pressedScale = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressedScale) * pressed.value }],
    opacity: 1 - 0.08 * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, { damping: 14, stiffness: 240 });
        onPressOut?.(e);
      }}
    />
  );
}
