import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Typeface } from '@/constants/theme';

const Pace = {
  /** Base delay between characters, ms. Jittered slightly so it feels typed, not printed. */
  char: 30,
  jitter: 14,
  comma: 180,
  sentence: 420,
  paragraph: 560,
  /** Delay before the first character. */
  lead: 350,
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
 */
export function useTypewriter(paragraphs: readonly string[], { enabled = true, onDone }: { enabled?: boolean; onDone?: () => void } = {}) {
  const reducedMotion = useReducedMotion();
  const total = useMemo(() => paragraphs.reduce((n, p) => n + p.length, 0), [paragraphs]);
  const [count, setCount] = useState(reducedMotion ? total : 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  }, [onDone]);

  useEffect(() => {
    if (!enabled) return;
    if (reducedMotion) {
      finish();
      return;
    }
    let i = 0;
    const step = () => {
      // Which character did we just reveal, and is it the last of its paragraph?
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
      setCount(i);
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
  }, [enabled, reducedMotion, paragraphs, total]);

  const skip = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCount(total);
    finish();
  }, [total, finish]);

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

type Props = {
  paragraphs: readonly string[];
  typed: string[];
  done: boolean;
  /** Hide the caret (e.g. once the user starts typing their answer). */
  hideCaret?: boolean;
  style?: TextStyle;
  paragraphGap?: number;
};

/** Renders typewriter output with an inline caret that blinks once typing has finished. */
export function TypewriterText({ paragraphs, typed, done, hideCaret, style, paragraphGap = 14 }: Props) {
  const caretOpacity = useSharedValue(1);
  useEffect(() => {
    if (!done) {
      cancelAnimation(caretOpacity);
      caretOpacity.value = 1;
      return;
    }
    caretOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );
    return () => cancelAnimation(caretOpacity);
  }, [done, caretOpacity]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: hideCaret ? 0 : caretOpacity.value }));

  // The caret sits after the last visible character of the paragraph currently being typed.
  const activeIndex = Math.max(0, typed.findIndex((t, i) => t.length < paragraphs[i].length));
  const caretParagraph = done ? paragraphs.length - 1 : activeIndex === -1 ? paragraphs.length - 1 : activeIndex;

  return (
    <View style={{ gap: paragraphGap }} accessible accessibilityLabel={paragraphs.join(' ')}>
      {paragraphs.map((p, i) => {
        const visible = typed[i] ?? '';
        if (!visible && i !== caretParagraph) return null;
        return (
          <Text key={i} style={[styles.text, style]}>
            {visible}
            {i === caretParagraph && (
              <Animated.Text style={[styles.caret, caretStyle]}>▎</Animated.Text>
            )}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#F5F5F7',
    fontFamily: Typeface.display,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  caret: {
    color: '#F5F5F7',
    fontFamily: Typeface.body,
  },
});
