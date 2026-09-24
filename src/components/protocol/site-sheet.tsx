import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { BODY_ASPECT, BodyMap, SUGGEST_COLOR } from '@/components/protocol/body-map';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { AppGutter, Spacing, Typeface } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { daysSince, siteById, suggestSite, type Figure, type Kind, type SiteId, type SiteView, type Suggestion } from '@/lib/sites';

type Props = {
  open: boolean;
  kind: Kind;
  value: SiteId | null;
  /** Taken doses with a site, most recent first — feeds the rotation suggestion. */
  history: { site: string; at: string }[];
  onClose: () => void;
  onDone: (site: SiteId) => void;
};

/**
 * Full-screen site picker: one large anatomical figure with a Front / Back switch, so every
 * point has room to be tapped. ✦ Suggest picks the next site in the rotation and says why.
 */
export function SiteSheet({ open, ...body }: Props) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={body.onClose}>
      {open ? <SiteBody {...body} /> : null}
    </Modal>
  );
}

function SiteBody({ kind, value, history, onClose, onDone }: Omit<Props, 'open'>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { sex } = useOnboarding();
  // The figure follows the biological sex given in onboarding; anything else shows the male anatomy.
  const figure: Figure = sex === 'female' ? 'female' : 'male';
  // "Now" is fixed when the picker opens; it mounts fresh each time, so this stays pure.
  const [now] = useState(() => new Date());
  const [selected, setSelected] = useState<SiteId | null>(value);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [view, setView] = useState<SiteView>(() => (value ? siteById(value)?.view ?? 'front' : 'front'));

  const suggest = () => {
    const next = suggestSite(history, kind, now);
    setSuggestion(next);
    setSelected(next.site.id);
    setView(next.site.view);
  };
  const chosen = selected ? siteById(selected) : null;
  const recent = new Set<SiteId>(history.filter((h) => now.getTime() - new Date(h.at).getTime() < 7 * 86_400_000).map((h) => h.site as SiteId));
  const chosenAgo = selected ? daysSince(history, selected, now) : null;
  // Header + switch above, status + button below; the figure takes what is left.
  const reserved = insets.top + 56 + 52 + 24 + 96 + 58 + Math.max(insets.bottom, Spacing.three) + Spacing.four;
  const mapWidth = Math.min(width - AppGutter * 2, (height - reserved) / BODY_ASPECT);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.35 }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <PressableScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={10} style={styles.headerButton}>
          <Text style={styles.cancel}>Cancel</Text>
        </PressableScale>
        <Text style={styles.title}>Injection site</Text>
        <PressableScale onPress={suggest} accessibilityRole="button" accessibilityLabel="Suggest the next site" hitSlop={8} style={styles.suggest}>
          <SymbolView name="sparkles" size={12} weight="semibold" tintColor={SUGGEST_COLOR} fallback={<Text style={styles.suggestGlyph}>✦</Text>} />
          <Text style={styles.suggestText}>Suggest</Text>
        </PressableScale>
      </View>

      <View style={styles.segment}>
        {(['front', 'back'] as SiteView[]).map((v) => {
          const on = view === v;
          return (
            <PressableScale key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: on }} pressedScale={0.98} style={[styles.segmentItem, on && styles.segmentItemOn]}>
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{v === 'front' ? 'Front' : 'Back'}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.stage}>
        <Animated.View key={view} entering={FadeIn.duration(220)}>
          <BodyMap view={view} figure={figure} width={mapWidth} kind={kind} selected={selected} suggested={suggestion?.site.id ?? null} recent={recent} onSelect={setSelected} />
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <Animated.View layout={LinearTransition.duration(220)} style={styles.status}>
          {suggestion && selected === suggestion.site.id ? (
            <Animated.View entering={FadeInDown.duration(280)} style={styles.reason}>
              <SymbolView name="sparkles" size={13} weight="semibold" tintColor={SUGGEST_COLOR} fallback={<Text style={styles.suggestGlyph}>✦</Text>} />
              <Text style={styles.reasonText} numberOfLines={3}>
                <Text style={styles.reasonSite}>{suggestion.site.label}. </Text>
                {suggestion.reason}
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.hintRow}>
              {recent.size ? (
                <View style={styles.legend}>
                  <View style={styles.legendDot}>
                    <View style={styles.legendDotInner} />
                  </View>
                  <Text style={styles.legendText}>Used in the last 7 days</Text>
                </View>
              ) : null}
              <Animated.Text entering={FadeIn.duration(200)} style={styles.hint} numberOfLines={2}>
                {chosen
                  ? `${chosen.label} selected${chosenAgo == null ? '.' : chosenAgo === 0 ? ' — used today.' : chosenAgo === 1 ? ' — used yesterday.' : ` — last used ${chosenAgo} days ago.`}`
                  : kind === 'sc'
                    ? 'Tap a point. Moving a few centimetres each time keeps absorption even and the tissue healthy.'
                    : 'Tap a muscle. Alternate sides between injections.'}
              </Animated.Text>
            </View>
          )}
        </Animated.View>
        <ShineButton label={chosen ? `Save · ${chosen.short}` : 'Save site'} disabled={!selected} onPress={() => selected && onDone(selected)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.one, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { minWidth: 72, height: 40, justifyContent: 'center' },
  cancel: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodyMedium, fontSize: 15 },
  title: { flex: 1, textAlign: 'center', color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  suggest: { minWidth: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, paddingHorizontal: 11, borderRadius: 16, backgroundColor: 'rgba(167,139,250,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(167,139,250,0.45)' },
  suggestGlyph: { color: SUGGEST_COLOR, fontSize: 12 },
  suggestText: { color: SUGGEST_COLOR, fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  segment: { marginTop: Spacing.two, marginHorizontal: AppGutter, flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  segmentItem: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentItemOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segmentText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.1 },
  segmentTextOn: { color: '#F5F5F7' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing.four },
  footer: { paddingHorizontal: AppGutter, gap: Spacing.two },
  status: { minHeight: 64, justifyContent: 'center' },
  hintRow: { gap: Spacing.one, alignItems: 'center' },
  hint: { textAlign: 'center', color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: '#FBBF24', alignItems: 'center', justifyContent: 'center' },
  legendDotInner: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FBBF24' },
  legendText: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11.5 },
  reason: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: 16, backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(167,139,250,0.3)' },
  reasonText: { flex: 1, color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18 },
  reasonSite: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold },
});
