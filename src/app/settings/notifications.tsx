import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { Row, Section, SettingsPage, ToggleRow } from '@/components/settings/settings-ui';
import { preferencesStore, usePreferences, type Preferences } from '@/lib/preferences';

const ITEMS: { key: keyof Preferences['notifications']; label: string; caption: string }[] = [
  { key: 'doses', label: 'Dose reminders', caption: 'When a scheduled dose is due.' },
  { key: 'missed', label: 'Missed dose follow-up', caption: 'A gentle nudge if a dose slips.' },
  { key: 'streak', label: 'Streak alerts', caption: 'Before a streak breaks.' },
  { key: 'weekly', label: 'Weekly summary', caption: 'Adherence and trends, once a week.' },
  { key: 'research', label: 'Research digest', caption: 'Occasional, cited reads. Off by default.' },
];

/** Per-topic notification preferences plus the system-level permission status. */
export default function NotificationsScreen() {
  const prefs = usePreferences();
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setGranted(p.granted))
      .catch(() => setGranted(null));
  }, []);

  const set = (key: keyof typeof prefs.notifications, v: boolean) => preferencesStore.set({ notifications: { ...prefs.notifications, [key]: v } });
  const off = granted === false;

  return (
    <SettingsPage title="Notifications" subtitle="what we nudge you about.">
      <Section
        title="Permission"
        hint={off ? 'Notifications are off in iOS Settings — enable them there, then pick topics below.' : undefined}>
        <Row
          symbol="bell.badge.fill"
          label="System permission"
          value={granted === null ? '…' : granted ? 'Allowed' : 'Off'}
          onPress={() => Linking.openSettings()}
          chevron
          last
        />
      </Section>

      <Section title="Topics">
        {ITEMS.map((item, i) => (
          <ToggleRow
            key={item.key}
            label={item.label}
            caption={item.caption}
            value={prefs.notifications[item.key]}
            onChange={(v) => set(item.key, v)}
            disabled={off}
            last={i === ITEMS.length - 1}
          />
        ))}
      </Section>
    </SettingsPage>
  );
}
