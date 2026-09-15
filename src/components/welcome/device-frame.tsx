import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

/**
 * A code-drawn iPhone: titanium band, black bezel, Dynamic Island, side buttons,
 * and a glass glare that slides as the device tilts. Tilt is driven by shared values
 * so it can follow gestures on the UI thread.
 */
type Props = {
  width: number;
  rotateY: SharedValue<number>;
  rotateX: SharedValue<number>;
  children: ReactNode;
};

export const DEVICE_ASPECT = 2.1;

export function deviceMetrics(width: number) {
  const height = width * DEVICE_ASPECT;
  const radius = width * 0.175;
  const bezel = width * 0.03;
  return {
    width,
    height,
    radius,
    bezel,
    screenWidth: width - bezel * 2,
    screenHeight: height - bezel * 2,
    screenRadius: radius - bezel,
  };
}

export function DeviceFrame({ width, rotateY, rotateX, children }: Props) {
  const m = deviceMetrics(width);

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { rotateY: `${rotateY.value}deg` },
      { rotateX: `${rotateX.value}deg` },
    ],
  }));
  const glareStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -rotateY.value * 4 }, { translateY: rotateX.value * 3 }],
  }));

  const button = (side: 'left' | 'right', top: number, height: number) => (
    <View
      key={`${side}-${top}`}
      style={[
        styles.button,
        { top: m.height * top, height: m.height * height, [side]: -2.5 },
        side === 'left' ? styles.buttonLeft : styles.buttonRight,
      ]}
    />
  );

  return (
    <Animated.View style={[{ width: m.width, height: m.height }, styles.shadow, tiltStyle]}>
      {button('left', 0.175, 0.045)}
      {button('left', 0.25, 0.085)}
      {button('left', 0.35, 0.085)}
      {button('right', 0.285, 0.14)}

      <View style={[styles.body, { borderRadius: m.radius }]}>
        <View style={[styles.bezel, { borderRadius: m.radius - 1.5 }]}>
          <View
            style={[
              styles.screen,
              { margin: m.bezel - 1.5, borderRadius: m.screenRadius, width: m.screenWidth, height: m.screenHeight },
            ]}>
            {children}
            <View
              pointerEvents="none"
              style={[
                styles.island,
                { width: m.width * 0.27, height: m.width * 0.075, top: m.width * 0.035, borderRadius: m.width * 0.0375 },
              ]}
            />
            <Animated.View pointerEvents="none" style={[styles.glare, glareStyle]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.6,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 22 },
    },
    default: {},
  }),
  body: {
    flex: 1,
    padding: 1.5,
    experimental_backgroundImage:
      'linear-gradient(155deg, #6a6a72 0%, #34343b 18%, #1e1e23 45%, #2b2b32 72%, #55555d 92%, #1a1a1e 100%)',
  },
  bezel: {
    flex: 1,
    backgroundColor: '#000',
  },
  screen: {
    backgroundColor: '#000',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  island: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#000',
  },
  glare: {
    ...StyleSheet.absoluteFill,
    left: -60,
    right: -60,
    experimental_backgroundImage:
      'linear-gradient(112deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.045) 28%, rgba(255,255,255,0) 52%)',
  },
  button: {
    position: 'absolute',
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#33333a',
  },
  buttonLeft: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  buttonRight: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
});
