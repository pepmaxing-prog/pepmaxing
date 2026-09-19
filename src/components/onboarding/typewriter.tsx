import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type ExitAnimationsValues,
} from 'react-native-reanimated';

import { Typeface } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useSplashPhase } from '@/lib/splash-state';

const Pace = {
  /** Base delay between characters, ms. Jittered slightly so it feels typed, not printed. */
  char: 28,
  jitter: 12,
  comma: 180,
  sentence: 420,
  paragraph: 640,
  /** Delay before the first character. */
  lead: 280,
} as const;

function delayAfter(char: string, endOfParagraph: boolean) {
  if (endOfParagraph) return Pace.paragraph;
  if ('.?!'.includes(char)) return Pace.sentence;
  if (',;:'.includes(char)) return Pace.comma;
  return Pace.char + (Math.random() * 2 - 1) * Pace.jitter;
}

/**
 * Types `paragraphs` out one character at a time. Returns the visible text per
 * paragraph, whether typing has finished, and a `skip` to complete instantly.
 *
 * Pass `initialCount` (character offset) so a later screen can keep prior lines
 * on screen and continue typing beneath them. Typing waits for the splash to dissolve.
 */
export function useTypewriter(
  paragraphs: readonly string[],
  { enabled: enabledProp = true, onDone, initialCount = 0 }: { enabled?: boolean; onDone?: () => void; initialCount?: number } = {},
) {
  const reducedMotion = useReducedMotion();
  const splashPhase = useSplashPhase();
  const enabled = enabledProp && splashPhase !== 'showing';
  const total = useMemo(() => paragraphs.reduce((n, p) => n + p.length, 0), [paragraphs]);
  const [count, setCount] = useState(reducedMotion ? total : Math.min(initialCount, total));
  // Mirrors `count` so a restart (e.g. once the splash clears) resumes rather than retypes.
  const progress = useRef(count);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  }, [onDone]);

  const advance = useCallback((n: number) => {
    progress.current = n;
    setCount(n);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let i = Math.min(Math.max(initialCount, progress.current), total);
    if (reducedMotion || i >= total) {
      advance(total);
      finish();
      return;
    }

    const step = () => {
      let remaining = i;
      let char = '';
      let endOfParagraph = false;
      for (const p of paragraphs) {
        if (remaining < p.length) {
          char = p[remaining];
          endOfParagraph = remaining === p.length - 1;
          break;
        }
        remaining -= p.length;
      }
      i += 1;
      advance(i);
      if (i >= total) {
        finish();
        return;
      }
      timer.current = setTimeout(step, delayAfter(char, endOfParagraph));
    };
    timer.current = setTimeout(step, Pace.lead);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reducedMotion, paragraphs, total, initialCount]);

  const skip = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    advance(total);
    finish();
  }, [total, advance, finish]);

  const typed = useMemo(() => {
    const out: string[] = [];
    let offset = 0;
    for (const p of paragraphs) {
      out.push(p.slice(0, Math.max(0, Math.min(p.length, count - offset))));
      offset += p.length;
    }
    return out;
  }, [count, paragraphs]);

  return { typed, done: count >= total, skip, count };
}

/** The transcript was designed on a 428pt-wide phone; type scales down proportionally on narrower ones. */
const REFERENCE_WIDTH = 428;
const TEXT = '#F2F2F4';
/** Opacity of the finished line that stays on screen above the one being typed. */
const DIM = 0.32;
const MOVE = { duration: 480, easing: Easing.out(Easing.cubic) } as const;

/** Display type shared by the transcript, the name field and step titles. */
export function useTranscriptType() {
  const { width } = useWindowDimensions();
  const scale = Math.min(1, width / REFERENCE_WIDTH);
  return useMemo(
    () => ({
      scale,
      text: {
        color: TEXT,
        fontFamily: Typeface.display,
        fontSize: Math.round(35 * scale),
        lineHeight: Math.round(45 * scale),
        letterSpacing: -0.7 * scale,
      } satisfies TextStyle,
      /** Space between the finished line and the one being typed. */
      gap: Math.round(100 * scale),
    }),
    [scale],
  );
}

type Props = {
  paragraphs: readonly string[];
  typed: string[];
  /**
   * Window y-coordinate where the top of the line being typed sits.
   * Defaults to the middle of the screen.
   */
  anchorY?: number;
  /** Promote the last paragraph to a top-aligned title; the finished line above it fades away. */
  title?: boolean;
  /** Distance from the top of the transcript to the title in `title` mode. */
  titleTop?: number;
  /** Shift up just enough to keep `children` (an input) above the keyboard. iOS only. */
  avoidKeyboard?: boolean;
  /** Appended to the line being typed, e.g. a pulsing ellipsis once it has finished. */
  tail?: string;
  /** Rendered directly beneath the line being typed. */
  children?: ReactNode;
};

/**
 * Conversation-style typewriter output. The line being typed is pinned at `anchorY`;
 * when the next line starts, the finished one moves up and dims, and anything older
 * drifts up and fades away, so at most two lines share the screen.
 */
export function TranscriptText({ paragraphs, typed, anchorY, title = false, titleTop = 0, avoidKeyboard = false, tail, children }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const type = useTranscriptType();
  const keyboard = useKeyboardHeight();
  const areaRef = useRef<View>(null);
  const [area, setArea] = useState<{ top: number; height: number } | null>(null);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [childHeight, setChildHeight] = useState(0);

  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    areaRef.current?.measureInWindow((_x, top) => setArea({ top, height }));
  }, []);

  const setHeight = useCallback((index: number, height: number) => {
    setHeights((cur) => (cur[index] === height ? cur : { ...cur, [index]: height }));
  }, []);

  const activeIndex = typed.findIndex((t, i) => t.length < paragraphs[i].length);
  const active = activeIndex < 0 ? paragraphs.length - 1 : activeIndex;
  const previous = title || active === 0 ? null : active - 1;

  const anchor = area ? (anchorY ?? windowHeight / 2) - area.top : 0;
  const previousBlock = previous === null ? 0 : (heights[previous] ?? 0) + type.gap;
  const spacer = Math.max(0, title ? titleTop : anchor - previousBlock);
  const ready = area !== null && (previous === null || heights[previous] !== undefined);

  // Free space between the bottom of `children` and the bottom of the area; the keyboard eats into it first.
  const free = area ? area.height - (spacer + previousBlock + (heights[active] ?? 0) + childHeight + Math.round(32 * type.scale)) : 0;
  const shiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: avoidKeyboard ? -Math.max(0, keyboard.get() - free) : 0 }],
  }));

  const gap = type.gap;
  const driftAway = useCallback(
    (values: ExitAnimationsValues) => {
      'worklet';
      return {
        initialValues: { opacity: DIM, originY: values.currentOriginY },
        animations: {
          opacity: withTiming(0, MOVE),
          originY: withTiming(values.currentOriginY - values.currentHeight - gap, MOVE),
        },
      };
    },
    [gap],
  );

  return (
    <View ref={areaRef} style={styles.area} onLayout={onAreaLayout}>
      <Animated.View style={[styles.column, ready ? null : styles.hidden, shiftStyle]}>
        <View style={{ height: spacer }} />
        {previous !== null && (
          <Line key={previous} text={typed[previous]} dim textStyle={type.text} exiting={driftAway} onHeight={(h) => setHeight(previous, h)} />
        )}
        <Line key={active} text={typed[active]} tail={tail} marginTop={previous === null ? 0 : gap} textStyle={type.text} onHeight={(h) => setHeight(active, h)} />
        <View onLayout={(e) => setChildHeight(e.nativeEvent.layout.height)}>{children}</View>
      </Animated.View>
    </View>
  );
}

type LineProps = {
  text: string;
  tail?: string;
  dim?: boolean;
  marginTop?: number;
  textStyle: TextStyle;
  exiting?: ComponentProps<typeof Animated.View>['exiting'];
  onHeight: (height: number) => void;
};

const layout = LinearTransition.duration(MOVE.duration).easing(MOVE.easing);

function Line({ text, tail, dim = false, marginTop = 0, textStyle, exiting, onHeight }: LineProps) {
  const opacity = useSharedValue(dim ? DIM : 1);
  useEffect(() => {
    opacity.set(withTiming(dim ? DIM : 1, MOVE));
  }, [dim, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View layout={layout} exiting={exiting} style={[{ marginTop }, fade]} onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
      <Text style={textStyle}>
        {text}
        {tail}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  column: { alignItems: 'stretch' },
  hidden: { opacity: 0 },
});
