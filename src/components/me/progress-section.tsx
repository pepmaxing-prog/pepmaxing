import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PhotoThumb } from '@/components/me/photo-thumb';
import { Sparkline } from '@/components/me/sparkline';
import { PressableScale } from '@/components/pressable-scale';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { chatStore } from '@/lib/assistant/store';
import { METRIC_DEFS, SCALE_LABELS, toDisplay, useHealth, type HealthMetric } from '@/lib/health';
import { useOnboarding } from '@/lib/onboarding-store';
import { addProgressPhoto } from '@/lib/photo-capture';
import { PHOTO_CATEGORIES, usePhotos } from '@/lib/photos';
import { formatRelative, useSchedule } from '@/lib/schedule';

const TILE: Record<HealthMetric, { symbol: SFSymbol; color: string }> = {
  weight: { symbol: 'scalemass.fill', color: '#F472B6' },
  bodyFat: { symbol: 'drop.fill', color: '#FBBF24' },
  leanMass: { symbol: 'figure.arms.open', color: '#34D399' },
  waist: { symbol: 'ruler.fill', color: '#818CF8' },
  mood: { symbol: 'face.smiling.fill', color: '#F59E0B' },
  energy: { symbol: 'bolt.fill', color: '#2DD4BF' },
};

/** Progress: an insights banner that asks the assistant, the six metric tiles, photos, and sharing. */
export function ProgressSection({ width }: { width: number }) {
  const router = useRouter();
  const entries = useHealth();
  const onboarding = useOnboarding();
  const schedule = useSchedule();
  const photos = usePhotos();
  const { units, referralCode } = onboarding;
  const now = new Date();
  const tileWidth = (width - Spacing.two) / 2;

  /** Opens the assistant with the insights question already asked, on the user's real data. */
  const askInsights = () => {
    chatStore.newChat();
    void chatStore.send('How am I doing?', { schedule, health: entries, onboarding, now: new Date() });
    router.navigate('/(tabs)/chat');
  };

  const share = async () => {
    try {
      await Share.share({ message: `I track my peptides with ${Brand.name}.${referralCode ? ` Use my code ${referralCode} when you sign up.` : ''}` });
    } catch {
      /* cancelled */
    }
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(360)}>
        <PressableScale onPress={askInsights} accessibilityRole="button" accessibilityLabel="Insights. How you're tracking — doses, health and trends" pressedScale={0.985} style={styles.banner}>
          <View style={styles.bannerIcon}>
            <SymbolView name="sparkles" size={18} weight="semibold" tintColor="#F5F5F7" fallback={null} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Insights</Text>
            <Text style={styles.bannerSub}>How you&apos;re tracking — doses, health and trends, from your own data</Text>
          </View>
          <SymbolView name="chevron.right" size={13} weight="semibold" tintColor="rgba(245,245,247,0.7)" fallback={null} />
        </PressableScale>
      </Animated.View>

      <View style={styles.grid}>
        {METRIC_DEFS.map((m, i) => {
          const mine = entries.filter((e) => e.metric === m.id).sort((a, b) => a.at.localeCompare(b.at));
          const latest = mine[mine.length - 1];
          const previous = mine[mine.length - 2];
          const unit = m.unit(units);
          const show = (v: number) => (m.kind === 'scale' ? `${v}` : Number(toDisplay(m.id, v, units).toFixed(1)).toString());
          const delta = latest && previous ? toDisplay(m.id, latest.value, units) - toDisplay(m.id, previous.value, units) : null;
          const tile = TILE[m.id];
          return (
            <Animated.View key={m.id} entering={FadeInDown.delay(60 + i * 40).duration(360)} style={{ width: tileWidth }}>
              <PressableScale onPress={() => router.push({ pathname: '/metric/[id]', params: { id: m.id } })} accessibilityRole="button" accessibilityLabel={`${m.label}${latest ? `, ${show(latest.value)} ${unit}` : ', no data yet'}`} pressedScale={0.985} style={styles.tile}>
                <View style={styles.tileTop}>
                  <View style={[styles.tileIcon, { backgroundColor: `${tile.color}22` }]}>
                    <SymbolView name={tile.symbol} size={14} weight="semibold" tintColor={tile.color} fallback={null} />
                  </View>
                  <SymbolView name="chevron.right" size={11} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} />
                </View>
                <Text style={styles.tileLabel}>{m.label}</Text>
                {latest ? (
                  <>
                    <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
                      {show(latest.value)}
                      <Text style={styles.tileUnit}> {m.kind === 'scale' ? SCALE_LABELS[latest.value - 1] : unit}</Text>
                    </Text>
                    <View style={styles.tileMeta}>
                      {delta != null && delta !== 0 ? (
                        <Text style={[styles.tileDelta, { color: tile.color }]}>
                          {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(m.kind === 'scale' ? 0 : 1)}
                        </Text>
                      ) : null}
                      <Text style={styles.tileWhen} numberOfLines={1}>
                        {formatRelative(new Date(latest.at), now)}
                      </Text>
                    </View>
                    <View style={styles.spark}>
                      <Sparkline values={mine.slice(-12).map((e) => e.value)} width={tileWidth - Spacing.three * 2} height={30} color={tile.color} />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.tileDash}>—</Text>
                    <Text style={styles.tileEmpty}>No data yet · tap to log</Text>
                  </>
                )}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.eyebrow}>PROGRESS PHOTOS</Text>
      <View style={styles.card}>
        {PHOTO_CATEGORIES.map((c, i) => {
          const mine = photos.filter((p) => p.category === c.id);
          const latest = mine[0];
          return (
            <PressableScale key={c.id} onPress={() => router.push({ pathname: '/photos/[category]', params: { category: c.id } })} accessibilityRole="button" accessibilityLabel={`${c.label} photos${mine.length ? `, ${mine.length}` : ', none yet'}`} pressedScale={0.99} style={[styles.photoRow, i < PHOTO_CATEGORIES.length - 1 && styles.divider]}>
              {latest ? (
                <PhotoThumb id={latest.id} style={styles.photoThumb} />
              ) : (
                <View style={[styles.tileIcon, styles.photoThumb, { backgroundColor: 'rgba(255,255,255,0.07)' }]}>
                  <SymbolView name="camera.fill" size={13} weight="semibold" tintColor="rgba(242,242,244,0.7)" fallback={null} />
                </View>
              )}
              <View style={styles.photoText}>
                <Text style={styles.photoLabel}>{c.label}</Text>
                <Text style={styles.photoSub} numberOfLines={1}>
                  {latest ? `${mine.length} photo${mine.length === 1 ? '' : 's'} · latest ${formatRelative(new Date(latest.at), now)}` : 'No photos yet — tap to capture your first'}
                </Text>
              </View>
              <PressableScale onPress={() => addProgressPhoto(c.id)} accessibilityRole="button" accessibilityLabel={`Add a ${c.label.toLowerCase()} photo`} hitSlop={8} style={styles.addPhoto}>
                <SymbolView name="plus" size={12} weight="bold" tintColor={Accent.primary} fallback={null} />
              </PressableScale>
            </PressableScale>
          );
        })}
      </View>

      <PressableScale onPress={share} accessibilityRole="button" accessibilityLabel="Share your invite code" pressedScale={0.985} style={[styles.card, styles.shareRow]}>
        <View style={[styles.tileIcon, { backgroundColor: 'rgba(52,211,153,0.14)' }]}>
          <SymbolView name="gift.fill" size={14} weight="semibold" tintColor={Accent.primary} fallback={null} />
        </View>
        <View style={styles.photoText}>
          <Text style={styles.photoLabel}>Invite a friend</Text>
          <Text style={styles.photoSub}>{referralCode ? `Share your code ${referralCode}` : 'Share the app'}</Text>
        </View>
        <SymbolView name="square.and.arrow.up" size={15} weight="medium" tintColor="rgba(242,242,244,0.6)" fallback={null} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, padding: Spacing.three, borderRadius: 22, backgroundColor: 'rgba(52,211,153,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.45)', experimental_backgroundImage: 'linear-gradient(120deg, rgba(52,211,153,0.28) 0%, rgba(20,60,50,0.55) 60%, rgba(129,140,248,0.22) 100%)' },
  bannerIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16.5, letterSpacing: -0.3 },
  bannerSub: { color: 'rgba(245,245,247,0.75)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  tile: { flex: 1, padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', minHeight: 156, gap: 4 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { marginTop: Spacing.one, color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  tileValue: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 24, letterSpacing: -0.6 },
  tileUnit: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 13, letterSpacing: 0 },
  tileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileDelta: { fontFamily: Typeface.bodySemiBold, fontSize: 12 },
  tileWhen: { flex: 1, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 11.5 },
  spark: { marginTop: 2, marginHorizontal: -Spacing.half },
  tileDash: { color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.display, fontSize: 24 },
  tileEmpty: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12 },
  eyebrow: { marginTop: Spacing.four, marginBottom: Spacing.half, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  card: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 64, paddingVertical: Spacing.two },
  photoThumb: { width: 44, height: 44, borderRadius: 12 },
  addPhoto: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  photoText: { flex: 1, gap: 2 },
  photoLabel: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  photoSub: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 64, marginTop: Spacing.two },
});
