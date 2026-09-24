import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/home/floating-tab-bar';
import { PressableScale } from '@/components/pressable-scale';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { toast, useToast } from '@/lib/toast';

/** Renders the current toast just above the floating tab bar. Mounted once in the tabs layout. */
export function Toasts() {
  const insets = useSafeAreaInsets();
  const current = useToast();
  if (!current) return null;
  return (
    <View style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, Spacing.two) + Spacing.three }]} pointerEvents="box-none">
      <Animated.View key={current.id} entering={FadeInUp.duration(320)} exiting={FadeOut.duration(220)} style={styles.toast} accessibilityLiveRegion="polite">
        <SymbolView name="checkmark.circle.fill" size={16} weight="semibold" tintColor={Accent.primary} fallback={null} />
        <Text style={styles.text} numberOfLines={1}>
          {current.text}
        </Text>
        {current.action ? (
          <PressableScale
            onPress={() => {
              const { onPress } = current.action!;
              toast.hide();
              onPress();
            }}
            accessibilityRole="button"
            hitSlop={10}>
            <Text style={styles.action}>{current.action.label}</Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: AppGutter, right: AppGutter },
  toast: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, height: 50, paddingHorizontal: Spacing.three, borderRadius: 16, backgroundColor: '#161A18', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  text: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.bodyMedium, fontSize: 14.5 },
  action: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 14.5 },
});
