import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleMark } from '@/components/brand-marks';
import { PressableScale } from '@/components/pressable-scale';
import { Brand, Legal } from '@/constants/brand';
import { Spacing, Typeface } from '@/constants/theme';

import { useSignIn } from './sign-in-actions';

/**
 * A small card over the welcome screen for people who already have an account: Apple, Google,
 * one line of legal. Shares the sign-in flow with the onboarding account step.
 */
export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { continueWith, busy, notice } = useSignIn(onClose);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View entering={FadeInDown.duration(320)} style={[styles.card, { marginBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.hint}>Sign in to pick up where you left off.</Text>
            </View>
            <PressableScale onPress={onClose} disabled={busy !== null} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <SymbolView name="xmark" size={12} weight="bold" tintColor="rgba(242,242,244,0.7)" fallback={<Text style={styles.closeGlyph}>×</Text>} />
            </PressableScale>
          </View>

          <PressableScale onPress={() => continueWith('apple')} disabled={busy !== null} accessibilityRole="button" accessibilityLabel="Continue with Apple" style={[styles.button, styles.apple, busy !== null && busy !== 'apple' && styles.dim]}>
            {busy === 'apple' ? <ActivityIndicator color={Brand.black} /> : <SymbolView name="apple.logo" size={18} weight="medium" tintColor={Brand.black} fallback={<View style={styles.appleFallback} />} />}
            <Text style={styles.appleLabel}>Continue with Apple</Text>
          </PressableScale>
          <PressableScale onPress={() => continueWith('google')} disabled={busy !== null} accessibilityRole="button" accessibilityLabel="Continue with Google" style={[styles.button, styles.google, busy !== null && busy !== 'google' && styles.dim]}>
            {busy === 'google' ? <ActivityIndicator color="#F5F5F7" /> : <GoogleMark size={17} />}
            <Text style={styles.googleLabel}>Continue with Google</Text>
          </PressableScale>

          {notice ? (
            <Animated.Text entering={FadeIn.duration(240)} style={styles.notice}>
              {notice}
            </Animated.Text>
          ) : null}
          <Text style={styles.legal}>
            By continuing you agree to our <LegalLink label="Terms" url={Legal.termsUrl} /> and <LegalLink label="Privacy Policy" url={Legal.privacyUrl} />.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return (
    <Text style={styles.legalLink} accessibilityRole={url ? 'link' : undefined} onPress={url ? () => Linking.openURL(url) : undefined} suppressHighlighting>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  card: { marginHorizontal: Spacing.two, padding: Spacing.four, paddingTop: Spacing.three + Spacing.half, borderRadius: 28, backgroundColor: '#121614', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, marginBottom: Spacing.one },
  headerText: { flex: 1, gap: 3 },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.5 },
  hint: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13.5 },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { color: 'rgba(242,242,244,0.7)', fontSize: 16, lineHeight: 18 },
  button: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  apple: { backgroundColor: '#F5F5F7' },
  appleFallback: { width: 14, height: 14, borderRadius: 7, backgroundColor: Brand.black },
  appleLabel: { color: Brand.black, fontFamily: Typeface.bodyBold, fontSize: 16, letterSpacing: -0.2 },
  google: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  googleLabel: { color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 16, letterSpacing: -0.2 },
  dim: { opacity: 0.5 },
  notice: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  legal: { marginTop: Spacing.half, color: 'rgba(242,242,244,0.42)', fontFamily: Typeface.body, fontSize: 11.5, lineHeight: 16, textAlign: 'center' },
  legalLink: { color: 'rgba(242,242,244,0.7)', textDecorationLine: 'underline' },
});
