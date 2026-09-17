import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Spacing, Typeface } from '@/constants/theme';

/** Settings-style row: label on the left, value or chevron on the right. */
export function ListRow({
  label,
  detail,
  value,
  onPress,
  destructive,
}: {
  label: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={!onPress}
      pressedScale={0.99}
      style={styles.row}
      onPress={onPress}>
      <View style={styles.main}>
        <Text style={[styles.label, destructive && styles.destructive, !onPress && styles.muted]}>
          {label}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
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

export function RowDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  main: { flex: 1, gap: 2 },
  label: { color: Colors.dark.text, fontFamily: Typeface.bodyMedium, fontSize: 15 },
  muted: { color: Colors.dark.textSecondary },
  destructive: { color: '#F87171' },
  detail: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 13 },
  value: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 15 },
  chevron: { color: Colors.dark.textTertiary, fontSize: 18 },
  divider: { height: 1, backgroundColor: Colors.dark.border },
});
