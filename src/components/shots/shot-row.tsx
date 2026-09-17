import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { medicationName } from '@/data/medications';
import { INJECTION_SITE_LABELS, PAIN_LABELS } from '@/data/labels';
import type { Shot } from '@/data/types';
import { Colors, Spacing, Typeface } from '@/constants/theme';

export function ShotRow({ shot, onPress }: { shot: Shot; onPress?: () => void }) {
  return (
    <PressableScale style={styles.row} accessibilityRole="button" pressedScale={0.99} onPress={onPress}>
      <View style={styles.main}>
        <Text style={styles.title}>
          {medicationName(shot.medicationId)} · {shot.dosageAmount} {shot.dosageUnit}
        </Text>
        <Text style={styles.detail}>
          {shot.time} · {INJECTION_SITE_LABELS[shot.injectionSite]} · {PAIN_LABELS[shot.painLevel]}
        </Text>
        {shot.notes ? (
          <Text style={styles.notes} numberOfLines={2}>
            {shot.notes}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <SymbolView
          name="chevron.right"
          size={14}
          tintColor={Colors.dark.textTertiary}
          fallback={<Text style={styles.chevron}>›</Text>}
        />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  main: { flex: 1, gap: 2 },
  title: { color: Colors.dark.text, fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  detail: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 13 },
  notes: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 13 },
  chevron: { color: Colors.dark.textTertiary, fontSize: 18 },
});
