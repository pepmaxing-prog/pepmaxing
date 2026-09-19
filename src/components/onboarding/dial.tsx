import { Canvas, LinearGradient, Path, Text as SkiaText, useFont, usePathValue, vec } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { AnimatedText } from '@/components/welcome/demos/shared';
import { Accent, Typeface } from '@/constants/theme';

/** Distance between consecutive values, pt. */
const STEP = 14;
const TICK_AREA = 44;
const LABEL_ROW = 22;
const DIAL_HEIGHT = TICK_AREA + LABEL_ROW;

type Readout = { text: string; unit?: string };

export type DialProps = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  width: number;
  /** Big readout for a value. Runs on the UI thread while dragging, so it must be a worklet. */
  format: (value: number) => Readout;
  /** Values divisible by these get taller ticks. */
  major: number;
  mid: number;
  /** Values divisible by this get a label beneath the ruler. */
  labelEvery: number;
  label: (value: number) => string;
  /** Fixed width for the big readout, wide enough for the longest value (it updates off the layout pass). */
  readoutWidth?: number;
  accessibilityLabel: string;
};

/**
 * Horizontal ruler for picking a number: drag or flick, it snaps to whole values and the
 * big readout follows on the UI thread. The ruler is drawn in Skia so ticks fade out toward
 * the edges; an invisible ScrollView underneath supplies the gesture and snapping.
 */
export function Dial({ min, max, value, onChange, width, format, major, mid, labelEvery, label, readoutWidth = 72, accessibilityLabel }: DialProps) {
  const scrollX = useSharedValue((value - min) * STEP);
  // Only the mount position: re-applying `contentOffset` after each `onChange` would kill a flick mid-way.
  const [initialOffset] = useState(() => ({ x: (value - min) * STEP, y: 0 }));
  const sidePadding = (width - STEP) / 2;
  const count = max - min + 1;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.set(e.contentOffset.x);
    },
  });
  const current = useDerivedValue(() => format(Math.min(max, Math.max(min, min + Math.round(scrollX.get() / STEP)))));
  const text = useDerivedValue(() => current.get().text);
  const unit = useDerivedValue(() => current.get().unit ?? '');

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(max, Math.max(min, min + Math.round(e.nativeEvent.contentOffset.x / STEP)));
    if (next !== value) onChange(next);
  };

  const readout = format(value);
  return (
    <View
      style={{ width }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${readout.text}${readout.unit ? ` ${readout.unit}` : ''}` }}>
      <View style={styles.readout}>
        <View style={styles.unitSlot} />
        <AnimatedText text={text} style={[styles.value, { width: readoutWidth }]} />
        <AnimatedText text={unit} style={[styles.unit, styles.unitSlot]} />
      </View>
      <View style={styles.dial}>
        <Ruler scrollX={scrollX} width={width} sidePadding={sidePadding} min={min} max={max} major={major} mid={mid} labelEvery={labelEvery} label={label} />
        <Animated.ScrollView
          horizontal
          directionalLockEnabled
          alwaysBounceHorizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={STEP}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={settle}
          onScrollEndDrag={settle}
          contentOffset={initialOffset}
          style={styles.scroller}>
          {/* Invisible track the size of the ruler: gives the scroll view real content to drag. */}
          <View style={{ width: sidePadding * 2 + count * STEP, height: DIAL_HEIGHT }} />
        </Animated.ScrollView>
        <View style={styles.needle} />
      </View>
    </View>
  );
}

type RulerProps = Pick<DialProps, 'min' | 'max' | 'major' | 'mid' | 'labelEvery' | 'label'> & {
  scrollX: SharedValue<number>;
  width: number;
  sidePadding: number;
};

function Ruler({ scrollX, width, sidePadding, min, max, major, mid, labelEvery, label }: RulerProps) {
  const font = useFont(require('@/assets/fonts/Inter-Medium.ttf'), 11);
  const count = max - min + 1;

  const ticks = usePathValue((path) => {
    'worklet';
    const offset = scrollX.get();
    for (let i = 0; i < count; i++) {
      const x = sidePadding + i * STEP + STEP / 2 - offset;
      if (x < -STEP || x > width + STEP) continue;
      const v = min + i;
      const h = v % major === 0 ? 26 : v % mid === 0 ? 18 : 12;
      path.addRRect({ rect: { x: x - 0.75, y: TICK_AREA - h, width: 1.5, height: h }, rx: 0.75, ry: 0.75 });
    }
  });

  const labelled = useMemo(() => {
    const out: number[] = [];
    for (let v = Math.ceil(min / labelEvery) * labelEvery; v <= max; v += labelEvery) out.push(v);
    return out;
  }, [min, max, labelEvery]);

  return (
    <Canvas style={[styles.canvas, { width, height: DIAL_HEIGHT }]}>
      <Path path={ticks} opacity={0.5}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={['rgba(255,255,255,0)', '#FFFFFF', '#FFFFFF', 'rgba(255,255,255,0)']}
          positions={[0, 0.22, 0.78, 1]}
        />
      </Path>
      {font
        ? labelled.map((v) => (
            <RulerLabel key={v} text={label(v)} index={v - min} font={font} scrollX={scrollX} width={width} sidePadding={sidePadding} />
          ))
        : null}
    </Canvas>
  );
}

type LabelProps = {
  text: string;
  index: number;
  font: NonNullable<ReturnType<typeof useFont>>;
  scrollX: SharedValue<number>;
  width: number;
  sidePadding: number;
};

function RulerLabel({ text, index, font, scrollX, width, sidePadding }: LabelProps) {
  const textWidth = font.getTextWidth(text);
  const x = useDerivedValue(() => sidePadding + index * STEP + STEP / 2 - scrollX.get() - textWidth / 2);
  const opacity = useDerivedValue(() => {
    const center = x.get() + textWidth / 2 - width / 2;
    return 0.55 * Math.max(0, 1 - Math.pow(Math.abs(center) / (width / 2), 2.2));
  });
  return <SkiaText x={x} y={TICK_AREA + 16} text={text} font={font} color="#F2F2F4" opacity={opacity} />;
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  // Mirrored either side of the value so it stays centred whether or not there's a unit.
  unitSlot: { width: 76 },
  value: {
    fontSize: 44,
    letterSpacing: -1.6,
    textAlign: 'center',
    height: 54,
    color: '#F5F5F7',
  },
  unit: {
    paddingLeft: 8,
    paddingTop: 22,
    height: 54,
    color: 'rgba(242,242,244,0.5)',
    fontFamily: Typeface.bodyMedium,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dial: { height: DIAL_HEIGHT, marginTop: 4 },
  canvas: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
  scroller: { height: DIAL_HEIGHT },
  needle: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -1.5,
    width: 3,
    height: TICK_AREA,
    borderRadius: 1.5,
    backgroundColor: Accent.primary,
    pointerEvents: 'none',
  },
});
