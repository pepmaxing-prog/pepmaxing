import { StyleSheet, Text, View } from 'react-native';

import { Vial } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { Spacing, Typeface } from '@/constants/theme';
import { categoryById, peptideById, type Stack } from '@/lib/peptides';

/** Horizontal-rail card for a curated stack: overlapping vials of its components, name, blurb. */
export function StackCard({ stack, onPress, width }: { stack: Stack; onPress: () => void; width: number }) {
  const category = categoryById(stack.category);
  const vials = stack.peptides.map((id) => peptideById(id)).filter(Boolean);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${stack.name} stack`} style={[styles.card, { width, borderColor: `${category.color}55` }]}>
      <View style={[styles.glow, { backgroundColor: `${category.color}22` }]} />
      <View style={styles.vials}>
        {vials.slice(0, 4).map((p, i) => (
          <View key={p!.id} style={[styles.vialSlot, i > 0 && { marginLeft: -10 }]}>
            <Vial color={categoryById(p!.category).color} size={30} />
          </View>
        ))}
      </View>
      <Text style={styles.name}>{stack.name}</Text>
      <Text style={styles.blurb} numberOfLines={2}>
        {stack.blurb}
      </Text>
      <View style={styles.footer}>
        <View style={[styles.chip, { backgroundColor: `${category.color}1F` }]}>
          <Text style={[styles.chipText, { color: category.color }]}>{category.label}</Text>
        </View>
        <Text style={styles.count}>
          {stack.peptides.length} peptide{stack.peptides.length === 1 ? '' : 's'}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    gap: 4,
  },
  glow: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60 },
  vials: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.one },
  vialSlot: { width: 30, height: 30 },
  name: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3 },
  blurb: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17, letterSpacing: -0.1, minHeight: 34 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontFamily: Typeface.bodySemiBold, fontSize: 10.5 },
  count: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodyMedium, fontSize: 11.5 },
});
