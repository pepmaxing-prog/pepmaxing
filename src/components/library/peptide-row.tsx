import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Vial } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { Spacing, Typeface } from '@/constants/theme';
import { categoryById, savedStore, type Peptide } from '@/lib/peptides';

type Props = {
  peptide: Peptide;
  saved: boolean;
  onPress: () => void;
  /** Hide the description for denser lists (search results, stack contents). */
  compact?: boolean;
};

/** Library row: vial coloured by category, name + nickname, one-line blurb, tags, bookmark. */
export function PeptideRow({ peptide, saved, onPress, compact }: Props) {
  const category = categoryById(peptide.category);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${peptide.name}, ${peptide.nickname}`} style={styles.row}>
      <Vial color={category.color} size={36} />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {peptide.name}
          </Text>
          {peptide.status === 'approved' ? <Text style={styles.approved}>APPROVED</Text> : null}
        </View>
        <Text style={styles.nickname} numberOfLines={1}>
          {peptide.nickname}
        </Text>
        {compact ? null : (
          <Text style={styles.blurb} numberOfLines={2}>
            {peptide.blurb}
          </Text>
        )}
        <View style={styles.tags}>
          {peptide.tags.slice(0, 3).map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: `${category.color}1F` }]}>
              <Text style={[styles.tagText, { color: category.color }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <PressableScale onPress={() => savedStore.toggle(peptide.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save'} style={styles.bookmark}>
        <SymbolView name={saved ? 'bookmark.fill' : 'bookmark'} size={16} weight="medium" tintColor={saved ? category.color : 'rgba(242,242,244,0.4)'} fallback={<View style={[styles.bookmarkFallback, saved && { backgroundColor: category.color }]} />} />
      </PressableScale>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.half,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  text: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  name: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3, flexShrink: 1 },
  approved: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodySemiBold, fontSize: 9, letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  nickname: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodyMedium, fontSize: 13, letterSpacing: -0.1 },
  blurb: { marginTop: 1, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: 0.1 },
  bookmark: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 },
  bookmarkFallback: { width: 10, height: 14, borderRadius: 2, backgroundColor: 'rgba(242,242,244,0.4)' },
});
