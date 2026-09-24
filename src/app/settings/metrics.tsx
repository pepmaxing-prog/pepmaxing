import { Row, Section, SettingsPage, ToggleRow } from '@/components/settings/settings-ui';
import { METRICS, PHOTO_CATEGORIES, preferencesStore, usePreferences } from '@/lib/preferences';

/** Which signals the dashboard charts. Photos stay private and off by default. */
export default function MetricsScreen() {
  const prefs = usePreferences();
  const setMetric = (id: keyof typeof prefs.metrics, v: boolean) => preferencesStore.set({ metrics: { ...prefs.metrics, [id]: v } });
  const setPhoto = (id: keyof typeof prefs.photos, v: boolean) => preferencesStore.set({ photos: { ...prefs.photos, [id]: v } });

  return (
    <SettingsPage title="Tracked metrics" subtitle="what we chart for you.">
      <Section title="Body & wellbeing" hint="Enabled metrics appear on the Me tab once tracking ships.">
        {METRICS.map((m, i) => (
          <ToggleRow key={m.id} label={m.label} value={prefs.metrics[m.id]} onChange={(v) => setMetric(m.id, v)} last={i === METRICS.length - 1} />
        ))}
      </Section>

      <Section title="Progress photos" hint="Photos live only on this device. Nothing here uploads anywhere.">
        {PHOTO_CATEGORIES.map((p, i) => (
          <ToggleRow key={p.id} label={p.label} value={prefs.photos[p.id]} onChange={(v) => setPhoto(p.id, v)} last={i === PHOTO_CATEGORIES.length - 1} />
        ))}
      </Section>

      <Section title="Apple Health" hint="Weight and energy readings can sync from Health once the integration ships.">
        <Row
          symbol="heart.fill"
          label="Sync with Apple Health"
          value={prefs.healthSync ? 'On' : 'Off'}
          onPress={() => preferencesStore.set({ healthSync: !prefs.healthSync })}
          chevron
          last
        />
      </Section>
    </SettingsPage>
  );
}
