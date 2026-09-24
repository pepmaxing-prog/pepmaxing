import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { BodyMap } from '@/components/protocol/body-map';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { formatRelative, siteHistory, type DoseEvent, type Schedule } from '@/lib/schedule';
import { kindFor, siteById, type Figure, type SiteId } from '@/lib/sites';

const AMBER = '#FBBF24';

/**
 * Application site, at a glance: both views of the figure with the last site lit and the week's
 * sites in amber, plus what the last injection recorded. Tapping opens the last dose (to add a
 * missing site) or the history.
 */
export function SiteCard({ schedule, now }: { schedule: Schedule; now: Date }) {
  const router = useRouter();
  const { sex } = useOnboarding();
  const figure: Figure = sex === 'female' ? 'female' : 'male';

  const injections = schedule.doses
    .filter((d) => d.log && !d.log.skipped && kindFor(d.administration))
    .sort((a, b) => b.log!.at.localeCompare(a.log!.at));
  const lastDose: DoseEvent | undefined = injections[0];
  if (!lastDose) return null;

  const history = siteHistory(schedule);
  const recent = new Set<SiteId>(history.filter((h) => now.getTime() - new Date(h.at).getTime() < 7 * 86_400_000).map((h) => h.site as SiteId));
  const lastSite = lastDose.log?.site ? siteById(lastDose.log.site) : null;
  const lastAt = new Date(lastDose.log!.at);
  const distinctWeek = recent.size;
  const kind = kindFor(lastDose.administration) ?? 'sc';

  return (
    <PressableScale
      onPress={() => (lastSite ? router.push('/history') : router.push({ pathname: '/log/[id]', params: { id: lastDose.id } }))}
      accessibilityRole="button"
      accessibilityLabel={lastSite ? `Application site. Last injection ${lastSite.label}, ${formatRelative(lastAt, now)}` : `Application site. Last injection ${formatRelative(lastAt, now)}, site not recorded. Tap to add it.`}
      pressedScale={0.985}
      style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <SymbolView name="scope" size={14} weight="semibold" tintColor={Accent.primary} fallback={null} />
        </View>
        <Text style={styles.title}>Application site</Text>
        <SymbolView name="chevron.right" size={12} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} />
      </View>
      <View style={styles.body}>
        <View style={styles.maps}>
          <BodyMap compact view="front" figure={figure} width={64} kind={kind} selected={lastSite?.view === 'front' ? lastSite.id : null} recent={recent} />
          <BodyMap compact view="back" figure={figure} width={64} kind={kind} selected={lastSite?.view === 'back' ? lastSite.id : null} recent={recent} />
        </View>
        <View style={styles.text}>
          <Text style={styles.when}>{formatRelative(lastAt, now)}</Text>
          {lastSite ? (
            <>
              <Text style={styles.site} numberOfLines={1}>
                {lastSite.label}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {lastDose.title} · {distinctWeek} site{distinctWeek === 1 ? '' : 's'} used this week
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.site} numberOfLines={1}>
                Site not recorded
              </Text>
              <Text style={[styles.meta, styles.metaAction]}>Tap to add it to {lastDose.title}</Text>
            </>
          )}
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: Accent.primary }]} />
            <Text style={styles.legendText}>Last</Text>
            <View style={[styles.legendDot, { backgroundColor: AMBER, marginLeft: 8 }]} />
            <Text style={styles.legendText}>This week</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  headerIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3 },
  body: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  maps: { flexDirection: 'row', gap: Spacing.one },
  text: { flex: 1, gap: 3, justifyContent: 'center' },
  when: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  site: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 20, letterSpacing: -0.5 },
  meta: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  metaAction: { color: Accent.primary, fontFamily: Typeface.bodyMedium },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 11 },
});
