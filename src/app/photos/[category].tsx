import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { PhotoThumb } from '@/components/me/photo-thumb';
import { PressableScale } from '@/components/pressable-scale';
import { SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { addProgressPhoto } from '@/lib/photo-capture';
import { PHOTO_CATEGORIES, photosStore, usePhotos, type PhotoCategory } from '@/lib/photos';
import { formatDayTitle, formatRelative } from '@/lib/schedule';

/** One category's photos: first vs latest side by side, then every photo, oldest at the bottom. */
export default function PhotoCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { width } = useWindowDimensions();
  const all = usePhotos();
  const meta = PHOTO_CATEGORIES.find((c) => c.id === category);
  const [selected, setSelected] = useState<string | null>(null);
  if (!meta) return <SettingsPage title="Photos" subtitle="unknown category.">{null}</SettingsPage>;

  const photos = all.filter((p) => p.category === meta.id); // newest first
  const latest = photos[0];
  const first = photos[photos.length - 1];
  const now = new Date();
  const inner = width - AppGutter * 2;
  const half = (inner - Spacing.three * 2 - Spacing.two) / 2;
  const tile = (inner - Spacing.two * 2) / 3;
  const compareWith = selected ? photos.find((p) => p.id === selected) ?? first : first;
  const days = latest && compareWith && latest.id !== compareWith.id ? Math.round((new Date(latest.at).getTime() - new Date(compareWith.at).getTime()) / 86_400_000) : 0;

  const remove = (id: string) =>
    Alert.alert('Delete this photo?', 'It is removed from this phone and from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void photosStore.remove(id);
          if (selected === id) setSelected(null);
        },
      },
    ]);

  return (
    <SettingsPage title={meta.label} subtitle={photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} · latest ${formatRelative(new Date(latest.at), now)}.` : 'no photos yet.'} footer={<ShineButton label={photos.length ? 'Add a photo' : 'Take the first photo'} onPress={() => addProgressPhoto(meta.id as PhotoCategory)} />}>
      {photos.length >= 2 && latest && compareWith ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.compare}>
          <View style={styles.compareHead}>
            <Text style={styles.eyebrow}>COMPARE</Text>
            <Text style={styles.compareMeta}>{days > 0 ? `${days} day${days === 1 ? '' : 's'} apart` : 'Tap a photo below to compare'}</Text>
          </View>
          <View style={styles.pair}>
            <View style={{ width: half }}>
              <PhotoThumb id={compareWith.id} style={{ width: half, height: half * 1.3, borderRadius: 18 }} />
              <Text style={styles.pairLabel}>{formatDayTitle(new Date(compareWith.at))}</Text>
            </View>
            <View style={{ width: half }}>
              <PhotoThumb id={latest.id} style={{ width: half, height: half * 1.3, borderRadius: 18 }} />
              <Text style={[styles.pairLabel, { color: Accent.primary }]}>Latest · {formatDayTitle(new Date(latest.at))}</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      {photos.length ? (
        <>
          <Text style={[styles.eyebrow, { marginTop: Spacing.four, marginBottom: Spacing.two }]}>ALL PHOTOS</Text>
          <Animated.View layout={LinearTransition.duration(220)} style={styles.grid}>
            {photos.map((p) => (
              <PressableScale key={p.id} onPress={() => setSelected(p.id === selected ? null : p.id)} onLongPress={() => remove(p.id)} accessibilityRole="imagebutton" accessibilityLabel={`Photo from ${formatDayTitle(new Date(p.at))}. Double-tap to compare, hold to delete.`} pressedScale={0.97} style={[styles.tile, { width: tile }, selected === p.id && styles.tileOn]}>
                <PhotoThumb id={p.id} style={{ width: tile, height: tile * 1.3, borderRadius: 14 }} />
                <View style={styles.tileFoot}>
                  <Text style={styles.tileDate} numberOfLines={1}>
                    {formatDayTitle(new Date(p.at))}
                  </Text>
                  {!p.uploaded ? <SymbolView name="icloud.and.arrow.up" size={11} weight="medium" tintColor="rgba(242,242,244,0.45)" fallback={null} /> : null}
                </View>
              </PressableScale>
            ))}
          </Animated.View>
          <Text style={styles.hint}>Tap a photo to compare it with the latest. Hold to delete. Photos are stored privately on your account, so a new phone keeps them.</Text>
        </>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <SymbolView name="camera.fill" size={24} weight="semibold" tintColor={Accent.primary} fallback={null} />
          </View>
          <Text style={styles.emptyTitle}>No {meta.label.toLowerCase()} photos yet</Text>
          <Text style={styles.emptyText}>{meta.hint} Consistency is what makes the comparison honest.</Text>
        </View>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  compare: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: Spacing.two, marginHorizontal: 0 },
  compareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  compareMeta: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 12.5 },
  pair: { flexDirection: 'row', gap: Spacing.two },
  pairLabel: { marginTop: 6, color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { borderRadius: 16, padding: 0, gap: 4 },
  tileOn: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  tileDate: { flex: 1, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 11 },
  hint: { marginTop: Spacing.three, marginBottom: Spacing.six, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six, paddingHorizontal: Spacing.three },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 21, letterSpacing: -0.5 },
  emptyText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
