import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  /** Docked above the keyboard. */
  footer?: ReactNode;
  onBack?: () => void;
};

/** Shared frame for onboarding steps: the brand stage, a back control, content and a docked footer. */
export function OnboardingShell({ children, footer, onBack }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.34 }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
          {onBack ? (
            <PressableScale
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={10}
              style={styles.back}>
              <SymbolView name="chevron.left" size={17} tintColor="#F5F5F7" weight="semibold" fallback={<View style={styles.backFallback} />} />
            </PressableScale>
          ) : (
            <View style={styles.back} />
          )}
        </View>

        <View style={styles.content}>{children}</View>

        {footer ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  backFallback: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#F5F5F7', transform: [{ rotate: '45deg' }] },
  content: { flex: 1, paddingHorizontal: Spacing.four },
  footer: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
});
