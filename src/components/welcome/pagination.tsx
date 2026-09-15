import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const DOT = 6;
const ACTIVE = 26;

type Props = {
  count: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  /** 0→1 progress of the auto-advance timer for the active page. */
  progress: SharedValue<number>;
};

/** Dots that stretch into a pill as their page arrives; the active pill fills with the auto-advance timer. */
export function Pagination({ count, scrollX, pageWidth, progress }: Props) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} pageWidth={pageWidth} progress={progress} />
      ))}
    </View>
  );
}

function Dot({ index, scrollX, pageWidth, progress }: Omit<Props, 'count'> & { index: number }) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / pageWidth - index);
    return {
      width: interpolate(distance, [0, 1], [ACTIVE, DOT], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, 1], [1, 0.45], Extrapolation.CLAMP),
    };
  });
  const fillStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / pageWidth - index);
    const active = distance < 0.5 ? 1 : 0;
    return { width: `${progress.value * 100 * active}%` };
  });
  return (
    <Animated.View style={[styles.dot, style]}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dot: {
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: DOT / 2 },
});
