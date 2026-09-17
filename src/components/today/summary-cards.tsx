import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';

/** Compact number + label tile; three of them sit across the top of Today. */
export function StatTile({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Card style={styles.tile}>
      <Text style={[styles.value, accent && styles.valueAccent]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, padding: Spacing.three, gap: Spacing.one },
  value: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 22,
    letterSpacing: -0.6,
  },
  valueAccent: { color: Accent.primary },
  label: {
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.bodyMedium,
    fontSize: 12,
  },
});
