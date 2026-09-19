import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { AVATAR_TINTS, AVATARS, LABELS, LEVELS, levelFor, MAX_LABELS, preferencesStore, randomUsername, usePreferences, type LabelId } from '@/lib/preferences';
import { useSchedule } from '@/lib/schedule';

const GOAL_LABEL: Record<string, string> = { 'lose-weight': 'Fat loss', 'build-recover': 'Recovery', 'look-feel': 'Vitality', heal: 'Healing', think: 'Focus', sleep: 'Sleep' };

export default function CommunityProfileScreen() {
  const router = useRouter();
  const prefs = usePreferences();
  const schedule = useSchedule();
  const { goals, experience } = useOnboarding();
  const [avatar, setAvatar] = useState(prefs.avatar);
  const [username, setUsername] = useState(prefs.username);
  const [labels, setLabels] = useState<LabelId[]>(prefs.labels);
  const [showLevels, setShowLevels] = useState(false);

  const xp = schedule.doses.filter((d) => d.logged).length;
  const { level, next, toNext } = levelFor(xp);
  const progress = next ? (xp - level.xp) / (next.xp - level.xp) : 1;

  const unlocked: Record<LabelId, boolean> = {
    experience: true,
    level: true,
    goal: goals.length > 0,
    peptide: xp > 0,
    stage: schedule.protocols.length > 0,
    tenure: xp > 0,
    milestone: xp >= 25,
    anniversary: false,
  };
  const previewLabels: Record<LabelId, string> = {
    experience: experience === 'curious' ? 'Curious' : experience === 'starting' ? 'Getting started' : experience === 'experienced' ? 'Experienced' : experience === 'seasoned' ? 'Seasoned' : 'New',
    level: level.name,
    goal: GOAL_LABEL[goals[0]] ?? 'Goal',
    peptide: 'Peptide',
    stage: 'Week 1',
    tenure: '1 day',
    milestone: `${Math.floor(xp / 25) * 25} doses`,
    anniversary: '1 year',
  };

  const toggleLabel = (id: LabelId) =>
    setLabels((cur) => (cur.includes(id) ? cur.filter((l) => l !== id) : cur.length >= MAX_LABELS ? cur : [...cur, id]));
  const tintFor = (name: string) => AVATAR_TINTS[Math.max(0, AVATARS.indexOf(name as (typeof AVATARS)[number])) % AVATAR_TINTS.length];
  const dirty = avatar !== prefs.avatar || username !== prefs.username || labels.join() !== prefs.labels.join();
  const save = () => {
    preferencesStore.set({ avatar, username: username.trim() || prefs.username, labels });
    router.back();
  };

  return (
    <SettingsPage title="Community Profile" subtitle="how you appear when you ask or answer." footer={<ShineButton label="Save" onPress={save} disabled={!dirty} />}>
      <Text style={styles.eyebrow}>PROFILE IMAGE</Text>
      <View style={styles.card}>
        <View style={styles.pickRow}>
          <View style={[styles.bigAvatar, { backgroundColor: `${tintFor(avatar)}26` }]}>
            <SymbolView name={avatar as never} size={30} weight="semibold" tintColor={tintFor(avatar)} fallback={<Text style={{ color: tintFor(avatar) }}>{username.slice(0, 2)}</Text>} />
          </View>
          <View style={styles.pickText}>
            <Text style={styles.pickTitle}>Pick your community vibe</Text>
            <Text style={styles.pickHint}>Your choice appears beside every post.</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {AVATARS.map((name, i) => {
            const on = name === avatar;
            const tint = AVATAR_TINTS[i % AVATAR_TINTS.length];
            return (
              <PressableScale key={name} onPress={() => setAvatar(name)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.cell, { backgroundColor: `${tint}22` }, on && { borderColor: tint }]}>
                <SymbolView name={name} size={20} weight="semibold" tintColor={tint} fallback={<View style={[styles.cellFallback, { backgroundColor: tint }]} />} />
              </PressableScale>
            );
          })}
        </View>
      </View>

      <Text style={styles.eyebrow}>USERNAME</Text>
      <View style={styles.card}>
        <View style={styles.usernameRow}>
          <TextInput
            value={username}
            onChangeText={(v) => setUsername(v.replace(/[^A-Za-z0-9_]/g, '').slice(0, 24))}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.username}
            accessibilityLabel="Username"
          />
          <PressableScale onPress={() => setUsername(randomUsername())} accessibilityRole="button" accessibilityLabel="Shuffle username" hitSlop={8} style={styles.shuffle}>
            <SymbolView name="shuffle" size={16} weight="semibold" tintColor="#F5F5F7" fallback={<Text style={{ color: '#F5F5F7' }}>⇄</Text>} />
          </PressableScale>
        </View>
        <Text style={styles.hint}>Usernames are anonymous and never taken from your real name. Shuffle for a new one.</Text>
      </View>

      <Text style={styles.eyebrow}>EXPERIENCE</Text>
      <PressableScale onPress={() => setShowLevels((v) => !v)} accessibilityRole="button" style={styles.card}>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <SymbolView name="leaf.fill" size={18} weight="semibold" tintColor={Accent.primary} fallback={null} />
          </View>
          <View style={styles.pickText}>
            <Text style={styles.pickTitle}>{level.name}</Text>
            <Text style={styles.pickHint}>{xp} XP · one per logged dose</Text>
          </View>
          <Text style={styles.toNext}>{next ? `${toNext} to next` : 'Max level'}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.seeAll}>{showLevels ? 'Hide badges' : 'See every badge'} ›</Text>
        {showLevels ? (
          <Animated.View entering={FadeIn.duration(200)} layout={LinearTransition} style={styles.levels}>
            {LEVELS.map((l) => (
              <View key={l.name} style={styles.levelItem}>
                <View style={[styles.levelDot, xp >= l.xp && styles.levelDotOn]} />
                <Text style={[styles.levelName, xp >= l.xp && styles.levelNameOn]}>{l.name}</Text>
                <Text style={styles.levelXp}>{l.xp} XP</Text>
              </View>
            ))}
          </Animated.View>
        ) : null}
      </PressableScale>

      <Text style={styles.eyebrow}>SHOWN WITH YOUR POSTS</Text>
      <Text style={styles.hintOutside}>Choose what appears beside your name. Labels never show exact numbers. Pick up to {MAX_LABELS}.</Text>
      <View style={styles.card}>
        {LABELS.map((l, i) => {
          const on = labels.includes(l.id);
          const locked = !unlocked[l.id];
          const full = !on && labels.length >= MAX_LABELS;
          return (
            <View key={l.id} style={[styles.labelRow, i < LABELS.length - 1 && styles.divider, (locked || full) && styles.dim]}>
              <View style={[styles.pill, on && styles.pillOn]}>
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{previewLabels[l.id]}</Text>
              </View>
              <View style={styles.pickText}>
                <Text style={styles.labelName}>{l.name}</Text>
                <Text style={styles.labelHint}>{locked ? l.unlock : l.hint}</Text>
              </View>
              <Switch value={on} onValueChange={() => toggleLabel(l.id)} disabled={locked || full} trackColor={{ true: Accent.primary, false: 'rgba(255,255,255,0.14)' }} thumbColor="#F5F5F7" ios_backgroundColor="rgba(255,255,255,0.14)" />
            </View>
          );
        })}
      </View>

      <Text style={styles.eyebrow}>HOW YOU\u2019LL APPEAR</Text>
      <View style={[styles.card, styles.preview]}>
        <View style={[styles.smallAvatar, { backgroundColor: `${tintFor(avatar)}26` }]}>
          <SymbolView name={avatar as never} size={14} weight="semibold" tintColor={tintFor(avatar)} fallback={null} />
        </View>
        <Text style={styles.previewName}>{username || '…'}</Text>
        {labels.map((id) => (
          <View key={id} style={styles.previewPill}>
            <Text style={styles.previewPillText}>{previewLabels[id]}</Text>
          </View>
        ))}
        <Text style={styles.previewTime}>1h</Text>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: Spacing.four, marginBottom: Spacing.one + Spacing.half, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  card: { padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  pickText: { flex: 1, gap: 2 },
  pickTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  pickHint: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  grid: { marginTop: Spacing.three, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  cellFallback: { width: 14, height: 14, borderRadius: 7 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  username: { flex: 1, height: 46, paddingHorizontal: Spacing.three, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', color: '#F5F5F7', fontFamily: Typeface.bodyMedium, fontSize: 15 },
  shuffle: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  hint: { marginTop: Spacing.two, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  hintOutside: { marginTop: -Spacing.one, marginBottom: Spacing.two, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  levelBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  toNext: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodyMedium, fontSize: 12 },
  track: { marginTop: Spacing.three, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2.5, backgroundColor: Accent.primary, minWidth: 6 },
  seeAll: { marginTop: Spacing.two, alignSelf: 'flex-end', color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  levels: { marginTop: Spacing.two, gap: Spacing.one + Spacing.half },
  levelItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  levelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  levelDotOn: { backgroundColor: Accent.primary },
  levelName: { flex: 1, color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 13.5 },
  levelNameOn: { color: '#F5F5F7' },
  levelXp: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingVertical: Spacing.two },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  dim: { opacity: 0.55 },
  pill: { minWidth: 64, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  pillOn: { backgroundColor: 'rgba(52,211,153,0.18)' },
  pillText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodySemiBold, fontSize: 11 },
  pillTextOn: { color: Accent.primary },
  labelName: { color: '#F2F2F4', fontFamily: Typeface.bodyMedium, fontSize: 14 },
  labelHint: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  smallAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  previewName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5 },
  previewPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.16)' },
  previewPillText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 10.5 },
  previewTime: { marginLeft: 'auto', color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 12 },
});
