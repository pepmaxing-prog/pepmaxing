import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Accent, Spacing, Typeface } from '@/constants/theme';

export type Stat = { symbol: SFSymbol; value: string; label: string; live?: boolean };

/** Three glanceable numbers under the day view. `live` tints the icon once the number means something. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <View key={s.label} style={styles.tile} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
          <SymbolView name={s.symbol} size={15} weight="semibold" tintColor={s.live ? Accent.primary : 'rgba(242,242,244,0.4)'} fallback={<View style={styles.fallback} />} />
          <Text style={[styles.value, !s.live && styles.valueIdle]}>{s.value}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  tile: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 4,
  },
  fallback: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(242,242,244,0.4)' },
  value: { marginTop: 2, color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 17, letterSpacing: -0.3 },
  valueIdle: { color: 'rgba(242,242,244,0.7)' },
  label: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodyMedium, fontSize: 11.5, letterSpacing: 0.1 },
});
