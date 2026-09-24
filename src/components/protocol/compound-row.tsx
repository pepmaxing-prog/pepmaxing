import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Vial } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { Spacing, Typeface } from '@/constants/theme';
import { compoundCategoryById, type Compound } from '@/lib/compounds';
import { categoryById, peptideById, type Stack } from '@/lib/peptides';

/** "Metabolic · Brand of semaglutide", "Healing · GHK-Cu · BPC-157 · TB-500", "Hormonal · Hormone". */
function captionFor(compound: Compound): string {
  const category = compoundCategoryById(compound.category).label;
  if (compound.custom) return `${category} · Custom`;
  if (compound.kind === 'brand') return `${category} · Brand of ${compound.aka?.toLowerCase() ?? 'a listed compound'}`;
  if (compound.aka) return `${category} · ${compound.aka}`;
  return compound.kind === 'hormone' ? `${category} · Hormone` : compound.kind === 'vitamin' ? `${category} · Micronutrient` : category;
}

type Props = {
  compound: Compound;
  selected: boolean;
  /** Already part of the protocol being edited: shown ticked, cannot be unticked here. */
  locked?: boolean;
  onPress: () => void;
  /** Opens the Library write-up when we have one. */
  onDetails?: () => void;
};

/** Selectable row for the compound picker: category vial, name, what it is, check. */
export const CompoundRow = memo(function CompoundRow({ compound, selected, locked, onPress, onDetails }: Props) {
  const category = compoundCategoryById(compound.category);
  const caption = locked ? 'Already in this protocol' : captionFor(compound);
  return (
    <PressableScale
      onPress={onPress}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: locked }}
      accessibilityLabel={compound.name}
      accessibilityHint={caption}
      pressedScale={0.985}
      style={[styles.row, selected && { borderColor: `${category.color}99`, backgroundColor: `${category.color}14` }, locked && styles.locked]}>
      <Vial color={category.color} size={34} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {compound.name}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      {onDetails ? (
        <PressableScale onPress={onDetails} hitSlop={10} accessibilityRole="button" accessibilityLabel={`About ${compound.name}`} style={styles.details}>
          <SymbolView name="info.circle" size={17} weight="regular" tintColor="rgba(242,242,244,0.45)" fallback={<Text style={styles.detailsFallback}>i</Text>} />
        </PressableScale>
      ) : null}
      <Check selected={selected} color={category.color} />
    </PressableScale>
  );
});

/** Selectable row for a curated stack: overlapping vials of its components, name, blurb, radio. */
export const StackRow = memo(function StackRow({ stack, selected, onPress, onDetails }: { stack: Stack; selected: boolean; onPress: () => void; onDetails?: () => void }) {
  const category = categoryById(stack.category);
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${stack.name} stack`}
      pressedScale={0.985}
      style={[styles.row, selected && { borderColor: `${category.color}99`, backgroundColor: `${category.color}14` }]}>
      <View style={[styles.vials, { width: 34 + (stack.peptides.length - 1) * 12 }]}>
        {stack.peptides.map((id, i) => (
          <View key={id} style={[styles.vialSlot, { left: i * 12 }]}>
            <Vial color={categoryById(peptideById(id)?.category ?? stack.category).color} size={34} />
          </View>
        ))}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {stack.name}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>
          {stack.peptides.map((id) => peptideById(id)?.name ?? id).join(' · ')}
        </Text>
      </View>
      {onDetails ? (
        <PressableScale onPress={onDetails} hitSlop={10} accessibilityRole="button" accessibilityLabel={`About ${stack.name}`} style={styles.details}>
          <SymbolView name="info.circle" size={17} weight="regular" tintColor="rgba(242,242,244,0.45)" fallback={<Text style={styles.detailsFallback}>i</Text>} />
        </PressableScale>
      ) : null}
      <Check selected={selected} color={category.color} />
    </PressableScale>
  );
});

function Check({ selected, color }: { selected: boolean; color: string }) {
  return (
    <View style={[styles.check, selected && { borderColor: color, backgroundColor: color }]}>
      {selected ? <SymbolView name="checkmark" size={11} weight="bold" tintColor="#062B1F" fallback={<View style={styles.checkDot} />} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  text: { flex: 1, gap: 2 },
  name: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15.5, letterSpacing: -0.3 },
  caption: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, letterSpacing: -0.1 },
  details: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  detailsFallback: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  locked: { opacity: 0.55 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(242,242,244,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#062B1F' },
  vials: { height: 34, position: 'relative' },
  vialSlot: { position: 'absolute', top: 0 },
});
