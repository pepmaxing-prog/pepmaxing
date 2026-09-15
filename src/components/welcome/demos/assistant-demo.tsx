import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Typeface } from '@/constants/theme';

import { AnimatedText, Demo, MockStatusBar, useDemoLoop } from './shared';

const LOOP_MS = 6400;
const QUESTION = 'How long is BPC-157 stable after reconstitution?';
const ANSWER =
  'Refrigerated at 2–8 °C, most sources cite up to 4 weeks. Keep it dark, avoid shaking, and label the vial with the date you mixed it.';
const CHIPS = ['Storage tips', 'Stack with TB-500', 'Set a reminder'];
const CHIP_DURATION = 380;
const CHIP_STAGGER = 90;
const CHIPS_TOTAL = CHIP_DURATION + (CHIPS.length - 1) * CHIP_STAGGER;
const TYPE_MS = 2100;

export function AssistantDemo({ active }: { active: boolean }) {
  const question = useSharedValue(0);
  const typing = useSharedValue(0);
  const bounce = useSharedValue(0);
  const chars = useSharedValue(0);
  const chips = useSharedValue(0);

  useDemoLoop(
    active,
    LOOP_MS,
    () => {
      question.value = withDelay(120, withSpring(1, { damping: 16, stiffness: 170, mass: 0.9 }));
      typing.value = withDelay(
        650,
        withSequence(withTiming(1, { duration: 220 }), withDelay(700, withTiming(0, { duration: 180 }))),
      );
      bounce.value = withRepeat(
        withSequence(withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) })),
        -1,
      );
      chars.value = withDelay(1750, withTiming(ANSWER.length, { duration: TYPE_MS, easing: Easing.linear }));
      chips.value = withDelay(1750 + TYPE_MS + 150, withTiming(1, { duration: CHIPS_TOTAL, easing: Easing.linear }));
    },
    () => {
      [question, typing, bounce, chars, chips].forEach(cancelAnimation);
      question.value = 0;
      typing.value = 0;
      bounce.value = 0;
      chars.value = 0;
      chips.value = 0;
    },
  );

  const answerText = useDerivedValue(() => ANSWER.slice(0, Math.round(chars.value)));
  const questionStyle = useAnimatedStyle(() => ({
    opacity: Math.min(question.value * 1.4, 1),
    transform: [{ translateY: 14 * (1 - question.value) }, { scale: 0.92 + 0.08 * question.value }],
  }));
  const typingStyle = useAnimatedStyle(() => ({
    opacity: typing.value,
    transform: [{ scale: 0.9 + 0.1 * typing.value }],
  }));
  const answerStyle = useAnimatedStyle(() => ({
    opacity: chars.value > 0 ? 1 : 0,
  }));

  return (
    <View style={styles.screen}>
      <MockStatusBar />
      <View style={styles.header}>
        <View style={styles.headerMark}>
          <View style={styles.headerMarkDot} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Assistant</Text>
          <Text style={styles.headerSubtitle}>Grounded in your protocol</Text>
        </View>
      </View>

      <View style={styles.chat}>
        <Animated.View style={[styles.bubble, styles.userBubble, questionStyle]}>
          <Text style={styles.userText}>{QUESTION}</Text>
        </Animated.View>

        <View style={styles.assistantColumn}>
          <Animated.View style={[styles.bubble, styles.assistantBubble, styles.typingBubble, typingStyle]}>
            {[0, 1, 2].map((i) => (
              <TypingDot key={i} index={i} bounce={bounce} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.bubble, styles.assistantBubble, styles.answerBubble, answerStyle]}>
            <AnimatedText text={answerText} multiline style={styles.answerText} />
          </Animated.View>
        </View>

        <View style={styles.chips}>
          {CHIPS.map((chip, i) => (
            <Chip key={chip} index={i} progress={chips} label={chip} />
          ))}
        </View>
      </View>

      <View style={styles.composer}>
        <Text style={styles.composerPlaceholder}>Ask anything…</Text>
        <View style={styles.sendButton}>
          <View style={styles.sendArrow} />
        </View>
      </View>
      <Text style={styles.disclaimer}>Educational only · not medical advice</Text>
    </View>
  );
}

function TypingDot({ index, bounce }: { index: number; bounce: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const phase = (bounce.value + index * 0.33) % 1;
    const y = -Math.sin(phase * Math.PI) * 3.5;
    return { transform: [{ translateY: y }], opacity: 0.45 + 0.55 * Math.sin(phase * Math.PI) };
  });
  return <Animated.View style={[styles.typingDot, style]} />;
}

function Chip({ index, progress, label }: { index: number; progress: SharedValue<number>; label: string }) {
  const style = useAnimatedStyle(() => {
    const elapsed = progress.value * CHIPS_TOTAL - index * CHIP_STAGGER;
    const local = Math.min(Math.max(elapsed / CHIP_DURATION, 0), 1);
    const eased = 1 - Math.pow(1 - local, 3);
    return { opacity: eased, transform: [{ translateY: 12 * (1 - eased) }] };
  });
  return (
    <Animated.View style={[styles.chip, style]}>
      <Text style={styles.chipText}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Demo.bg },
  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Demo.border,
  },
  headerMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMarkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Demo.text },
  headerTitle: { color: Demo.text, fontFamily: Typeface.display, fontSize: 18, letterSpacing: -0.4 },
  headerSubtitle: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 11.5, marginTop: 1 },
  chat: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Demo.text, borderBottomRightRadius: 6 },
  userText: { color: '#000', fontFamily: Typeface.bodyMedium, fontSize: 13.5, lineHeight: 18 },
  assistantColumn: { alignSelf: 'flex-start', maxWidth: '88%' },
  assistantBubble: {
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    borderBottomLeftRadius: 6,
  },
  typingBubble: { position: 'absolute', flexDirection: 'row', gap: 4, paddingVertical: 13, paddingHorizontal: 14 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Demo.muted },
  answerBubble: { minHeight: 40 },
  answerText: { fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19, color: Demo.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Demo.border,
    backgroundColor: Demo.cardRaised,
  },
  chipText: { color: Demo.text, fontFamily: Typeface.bodyMedium, fontSize: 12 },
  composer: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 44,
    borderRadius: 22,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    paddingLeft: 16,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerPlaceholder: { color: Demo.faint, fontFamily: Typeface.body, fontSize: 13.5 },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Demo.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendArrow: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000',
    transform: [{ rotate: '-45deg' }, { translateY: 2 }],
  },
  disclaimer: {
    color: Demo.faint,
    fontFamily: Typeface.body,
    fontSize: 10.5,
    textAlign: 'center',
    marginBottom: 22,
  },
});
