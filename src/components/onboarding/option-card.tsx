import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';

/** Full-width answer row: large tap target, selection carried by the border and a dot. */
export function OptionCard({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}>
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <View style={[styles.dot, selected && styles.dotSelected]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },
  cardSelected: { borderColor: Accent.primary, backgroundColor: Accent.primarySoft },
  text: { flex: 1, gap: Spacing.half },
  label: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodySemiBold, fontSize: 16 },
  labelSelected: { color: Colors.dark.text },
  detail: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 13 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  dotSelected: { borderColor: Accent.primary, backgroundColor: Accent.primary },
});
