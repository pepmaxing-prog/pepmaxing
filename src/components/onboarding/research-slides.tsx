import { Canvas, Line as SkiaLine, LinearGradient, Path, RoundedRect, Skia, usePathValue, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Gutter } from '@/components/onboarding/onboarding-shell';
import { AnimatedText } from '@/components/welcome/demos/shared';
import { Pagination } from '@/components/welcome/pagination';
import { Accent, Spacing, Typeface } from '@/constants/theme';

/** How long each highlight stays before the next one slides in. */
const DWELL_MS = 3000;
const DRAW_MS = 1000;
const DRAW_DELAY_MS = 220;
const TEXT = '#F5F5F7';
const MUTED = 'rgba(242,242,244,0.5)';

type Kind = 'weight' | 'heart' | 'approved';

type Slide = { kind: Kind; caption: string; source: string };

/** Peer-reviewed figures only; each headline number is the study's own. */
const SLIDES: Slide[] = [
  {
    kind: 'weight',
    caption: 'Body weight lost over 72 weeks\non tirzepatide 15 mg.',
    source: 'SURMOUNT-1 · New England Journal of Medicine, 2022',
  },
  {
    kind: 'heart',
    caption: 'Fewer major cardiovascular\nevents with semaglutide.',
    source: 'SELECT · New England Journal of Medicine, 2023',
  },
  {
    kind: 'approved',
    caption: 'Peptide medicines approved\nworldwide, insulin to GLP-1s.',
    source: 'Signal Transduction & Targeted Therapy, 2022',
  },
];

function easeOut(p: number) {
  'worklet';
  return 1 - Math.pow(1 - p, 3);
}

function headline(kind: Kind, p: number) {
  'worklet';
  const e = easeOut(p);
  if (kind === 'weight') return `\u2212${(22.5 * e).toFixed(1)}%`;
  if (kind === 'heart') return `${Math.round(20 * e)}%`;
  return `${Math.round(80 * e)}+`;
}

type Props = {
  /** Fires once the final highlight is on screen. */
  onLastSlide: () => void;
};

/**
 * Three research highlights as a swipeable, auto-advancing pager. Each one draws its
 * data visual and counts its number up as it arrives; the active dot fills as a timer.
 */
export function ResearchSlides({ onLastSlide }: Props) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const autoProgress = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pagerHeight, setPagerHeight] = useState(0);
  const last = page === SLIDES.length - 1;

  useEffect(() => {
    if (last) onLastSlide();
  }, [last, onLastSlide]);

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  useEffect(() => {
    if (dragging || last) {
      cancelAnimation(autoProgress);
      autoProgress.set(last ? 1 : 0);
      return;
    }
    autoProgress.set(0);
    autoProgress.set(withTiming(1, { duration: DWELL_MS, easing: Easing.linear }));
    const timer = setTimeout(() => goTo(page + 1), DWELL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dragging, last, width]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.set(e.contentOffset.x);
    },
  });
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
    setDragging(false);
  };

  // Everything but the visual: number, two caption lines, source, and breathing room.
  const visualHeight = Math.max(120, Math.min(220, pagerHeight - 290));

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => setDragging(true)}
        onMomentumScrollEnd={settle}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        style={styles.pager}
        contentContainerStyle={{ width: width * SLIDES.length }}>
        {SLIDES.map((slide, i) => (
          <SlideView
            key={slide.kind}
            slide={slide}
            active={i === page}
            width={width}
            visualHeight={visualHeight}
            reducedMotion={reducedMotion}
            onPress={i < SLIDES.length - 1 ? () => goTo(i + 1) : undefined}
          />
        ))}
      </Animated.ScrollView>
      <View style={styles.dots}>
        <Pagination count={SLIDES.length} scrollX={scrollX} pageWidth={width} progress={autoProgress} />
      </View>
    </View>
  );
}

type SlideProps = {
  slide: Slide;
  active: boolean;
  width: number;
  visualHeight: number;
  reducedMotion: boolean;
  onPress?: () => void;
};

function SlideView({ slide, active, width, visualHeight, reducedMotion, onPress }: SlideProps) {
  const progress = useSharedValue(0);

  // Replays each time the slide arrives; a slide keeps its finished state while it scrolls away.
  useEffect(() => {
    cancelAnimation(progress);
    if (!active) return;
    if (reducedMotion) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(withDelay(DRAW_DELAY_MS, withTiming(1, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) })));
  }, [active, reducedMotion, progress]);

  const number = useDerivedValue(() => headline(slide.kind, progress.get()));
  const visualWidth = width - Gutter * 2;

  return (
    <Pressable
      style={[styles.slide, { width }]}
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityLabel={`${headline(slide.kind, 1)}. ${slide.caption.replace('\n', ' ')} ${slide.source}`}>
      <View style={{ width: visualWidth, height: visualHeight }}>
        {slide.kind === 'weight' && <WeightCurve progress={progress} width={visualWidth} height={visualHeight} />}
        {slide.kind === 'heart' && <EventBars progress={progress} width={visualWidth} height={visualHeight} />}
        {slide.kind === 'approved' && <ApprovalDots progress={progress} width={visualWidth} height={visualHeight} />}
      </View>
      <AnimatedText text={number} style={styles.number} />
      <Text style={styles.caption}>{slide.caption}</Text>
      <Text style={styles.source} numberOfLines={2}>
        {slide.source}
      </Text>
    </Pressable>
  );
}

type VisualProps = { progress: SharedValue<number>; width: number; height: number };

const CHART_PAD = 14;

/** Trajectory of the SURMOUNT-1 15 mg arm: steep at first, then levelling off toward −22.5%. */
function curveY(t: number, height: number) {
  'worklet';
  return CHART_PAD + (height - CHART_PAD * 2) * (1 - Math.pow(1 - t, 2.2));
}

function WeightCurve({ progress, width, height }: VisualProps) {
  // Inset the ends so the end dot and its halo stay inside the canvas.
  const span = width - CHART_PAD * 2;
  const stroke = usePathValue((path) => {
    'worklet';
    const t = progress.get();
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const f = (i / steps) * t;
      const x = CHART_PAD + f * span;
      const y = curveY(f, height);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
  });
  const fill = usePathValue((path) => {
    'worklet';
    const t = progress.get();
    const steps = 48;
    path.moveTo(CHART_PAD, height);
    for (let i = 0; i <= steps; i++) {
      const f = (i / steps) * t;
      path.lineTo(CHART_PAD + f * span, curveY(f, height));
    }
    path.lineTo(CHART_PAD + t * span, height);
    path.close();
  });
  const cx = useDerivedValue(() => CHART_PAD + progress.get() * span);
  const cy = useDerivedValue(() => curveY(progress.get(), height));
  const halo = useDerivedValue(() => 0.35 * progress.get());

  return (
    <View>
      <Canvas style={{ width, height }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <SkiaLine
            key={f}
            p1={vec(CHART_PAD, CHART_PAD + (height - CHART_PAD * 2) * f)}
            p2={vec(width - CHART_PAD, CHART_PAD + (height - CHART_PAD * 2) * f)}
            color="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        ))}
        <Path path={fill}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['rgba(52,211,153,0.3)', 'rgba(52,211,153,0)']} />
        </Path>
        <Path path={stroke} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" color={TEXT} />
        <EndDot cx={cx} cy={cy} halo={halo} />
      </Canvas>
      <View style={[styles.axis, { paddingHorizontal: CHART_PAD - 4 }]}>
        <Text style={styles.axisLabel}>Week 0</Text>
        <Text style={styles.axisLabel}>Week 72</Text>
      </View>
    </View>
  );
}

function EndDot({ cx, cy, halo }: { cx: SharedValue<number>; cy: SharedValue<number>; halo: SharedValue<number> }) {
  const ring = usePathValue((path) => {
    'worklet';
    path.addCircle(cx.get(), cy.get(), 12);
  });
  const dot = usePathValue((path) => {
    'worklet';
    path.addCircle(cx.get(), cy.get(), 5);
  });
  return (
    <>
      <Path path={ring} color={Accent.primary} opacity={halo} />
      <Path path={dot} color={Accent.primary} />
    </>
  );
}

/** SELECT: 20% relative reduction in major adverse cardiovascular events versus placebo. */
function EventBars({ progress, width, height }: VisualProps) {
  const barWidth = Math.min(72, width * 0.2);
  const gap = barWidth * 0.75;
  const left = width / 2 - gap / 2 - barWidth;
  const right = width / 2 + gap / 2;
  const baseline = height - 1;
  const maxBar = height - CHART_PAD - 1;

  const placeboHeight = useDerivedValue(() => Math.max(0, maxBar * easeOut(Math.min(1, progress.get() / 0.85))));
  const placeboY = useDerivedValue(() => baseline - placeboHeight.get());
  const treatedHeight = useDerivedValue(() => Math.max(0, maxBar * 0.8 * easeOut(Math.max(0, (progress.get() - 0.2) / 0.8))));
  const treatedY = useDerivedValue(() => baseline - treatedHeight.get());

  return (
    <View>
      <Canvas style={{ width, height }}>
        <SkiaLine p1={vec(0, baseline)} p2={vec(width, baseline)} color="rgba(255,255,255,0.14)" strokeWidth={1} />
        <RoundedRect x={left} y={placeboY} width={barWidth} height={placeboHeight} r={10} color="rgba(255,255,255,0.2)" />
        <RoundedRect x={right} y={treatedY} width={barWidth} height={treatedHeight} r={10} color={Accent.primary} />
      </Canvas>
      <View style={styles.axis}>
        <Text style={[styles.axisLabel, styles.barLabel, { left: left + barWidth / 2 - 60 }]}>Placebo</Text>
        <Text style={[styles.axisLabel, styles.barLabel, { left: right + barWidth / 2 - 60 }]}>Semaglutide</Text>
      </View>
    </View>
  );
}

const COLS = 10;
const ROWS = 8;

/** One dot per approved peptide medicine, lighting up row by row. */
function ApprovalDots({ progress, width, height }: VisualProps) {
  const step = Math.min(height / ROWS, 27);
  const radius = step * 0.2;
  const originX = (width - step * COLS) / 2 + step / 2;
  const originY = (height - step * ROWS) / 2 + step / 2;

  const all = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    for (let i = 0; i < COLS * ROWS; i++) builder.addCircle(originX + (i % COLS) * step, originY + Math.floor(i / COLS) * step, radius);
    return builder.build();
  }, [originX, originY, step, radius]);
  const lit = usePathValue((path) => {
    'worklet';
    const count = Math.round(COLS * ROWS * easeOut(progress.get()));
    for (let i = 0; i < count; i++) path.addCircle(originX + (i % COLS) * step, originY + Math.floor(i / COLS) * step, radius);
  });

  return (
    <Canvas style={{ width, height }}>
      <Path path={all} color="rgba(255,255,255,0.1)" />
      <Path path={lit} color={Accent.primary} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, marginHorizontal: -Gutter },
  slide: {
    paddingHorizontal: Gutter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    marginTop: Spacing.five,
    width: '100%',
    height: 70,
    fontSize: 58,
    letterSpacing: -2.2,
    textAlign: 'center',
    color: TEXT,
  },
  caption: {
    marginTop: Spacing.two,
    color: 'rgba(242,242,244,0.92)',
    fontFamily: Typeface.bodyMedium,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  source: {
    marginTop: Spacing.three - Spacing.one,
    color: MUTED,
    fontFamily: Typeface.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  axis: {
    marginTop: Spacing.two,
    height: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: MUTED,
    fontFamily: Typeface.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  barLabel: { position: 'absolute', top: 0, width: 120, textAlign: 'center' },
  dots: { paddingTop: Spacing.three, paddingBottom: Spacing.four, alignItems: 'center' },
});
