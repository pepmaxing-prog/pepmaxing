import { useEffect } from 'react';
import { StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';

import { Accent, Typeface } from '@/constants/theme';

/**
 * Demos are laid out at a fixed logical size and scaled to fit the device screen,
 * so type and spacing stay identical across phone sizes. 9:19.5 like a modern iPhone.
 */
export const DEMO_WIDTH = 300;
export const DEMO_HEIGHT = 650;

export const Demo = {
  bg: '#050506',
  card: '#131316',
  cardRaised: '#1A1A1F',
  border: '#22222A',
  text: '#F5F5F7',
  muted: '#8E9098',
  faint: '#55575F',
  accent: Accent.primary,
  accentSoft: Accent.primarySoft,
  liquid: Accent.liquid,
} as const;

/**
 * Runs `play` when the demo becomes active and replays it every `loopMs`;
 * `reset` puts every shared value back to its starting state.
 */
export function useDemoLoop(active: boolean, loopMs: number, play: () => void, reset: () => void) {
  useEffect(() => {
    if (!active) {
      reset();
      return;
    }
    let raf = 0;
    reset();
    raf = requestAnimationFrame(play);
    const id = setInterval(() => {
      reset();
      raf = requestAnimationFrame(play);
    }, loopMs);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, loopMs]);
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Text driven from a shared value entirely on the UI thread (counters, typewriter). */
export function AnimatedText({
  text,
  style,
  multiline,
}: {
  text: SharedValue<string>;
  style?: TextStyle | TextStyle[];
  multiline?: boolean;
}) {
  const animatedProps = useAnimatedProps(() => ({ text: text.value, defaultValue: text.value }) as never);
  return (
    <AnimatedTextInput
      editable={false}
      multiline={multiline}
      scrollEnabled={false}
      underlineColorAndroid="transparent"
      style={[styles.animatedText, style]}
      animatedProps={animatedProps}
    />
  );
}

export function MockStatusBar() {
  return (
    <View style={styles.statusBar}>
      <Text style={styles.statusTime}>9:41</Text>
      <View style={styles.statusRight}>
        <View style={styles.signal}>
          {[4, 6, 8, 10].map((h) => (
            <View key={h} style={[styles.signalBar, { height: h }]} />
          ))}
        </View>
        <View style={styles.battery}>
          <View style={styles.batteryFill} />
        </View>
      </View>
    </View>
  );
}

export function DemoHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>K</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  animatedText: {
    padding: 0,
    margin: 0,
    color: Demo.text,
    fontFamily: Typeface.display,
  },
  statusBar: {
    height: 44,
    paddingHorizontal: 26,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTime: {
    color: Demo.text,
    fontFamily: Typeface.bodySemiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 },
  signalBar: { width: 2.5, borderRadius: 1, backgroundColor: Demo.text },
  battery: {
    width: 22,
    height: 11,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    padding: 1.5,
  },
  batteryFill: { flex: 1, width: '78%', borderRadius: 1.5, backgroundColor: Demo.text },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    color: Demo.muted,
    fontFamily: Typeface.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    color: Demo.text,
    fontFamily: Typeface.display,
    fontSize: 26,
    letterSpacing: -0.7,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Demo.cardRaised,
    borderWidth: 1,
    borderColor: Demo.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Demo.text, fontFamily: Typeface.bodySemiBold, fontSize: 12 },
});
