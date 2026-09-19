import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gutter } from '@/components/onboarding/onboarding-shell';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';

type Props = { symbol: SFSymbol; title: string; text: string; bullets: string[] };

/** Stand-in for a tab whose feature is still being built: says what's coming, on the shared stage. */
export function PlaceholderTab({ symbol, title, text, bullets }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.3 }} />
      <View style={[styles.content, { paddingTop: insets.top + Spacing.five }]}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.disc}>
          <SymbolView name={symbol} size={26} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.fallback} />} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(80).duration(420)} style={styles.title} accessibilityRole="header">
          {title}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(160).duration(400)} style={styles.text}>
          {text}
        </Animated.Text>
        <View style={styles.list}>
          {bullets.map((b, i) => (
            <Animated.View key={b} entering={FadeInDown.delay(260 + i * 80).duration(400)} style={styles.row}>
              <View style={styles.bullet} />
              <Text style={styles.rowText}>{b}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  content: { flex: 1, paddingHorizontal: Gutter },
  disc: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.35)', alignItems: 'center', justifyContent: 'center' },
  fallback: { width: 22, height: 22, borderRadius: 11, backgroundColor: Accent.primary },
  title: { marginTop: Spacing.four, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  text: { marginTop: Spacing.two, color: 'rgba(242,242,244,0.62)', fontFamily: Typeface.body, fontSize: 16, lineHeight: 23, letterSpacing: -0.15 },
  list: { marginTop: Spacing.four, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Accent.primary },
  rowText: { flex: 1, color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.body, fontSize: 15, letterSpacing: -0.15 },
});
