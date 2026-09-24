import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Row, Section, SettingsPage } from '@/components/settings/settings-ui';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { estimateGoals, GOAL_FIELDS, preferencesStore, usePreferences, type Goals } from '@/lib/preferences';

/** Daily goal editor: steppers per field; "Use estimate" returns to the values derived from the body answers. */
export default function GoalsScreen() {
  const prefs = usePreferences();
  const onboarding = useOnboarding();
  const estimate = estimateGoals(onboarding);
  const goals = prefs.customGoals ?? estimate.goals;

  const bump = (key: keyof Goals, dir: 1 | -1) => {
    const field = GOAL_FIELDS.find((f) => f.key === key)!;
    const next = Math.min(field.max, Math.max(field.min, goals[key] + field.step * dir));
    preferencesStore.set({ customGoals: { ...goals, [key]: next } });
  };

  return (
    <SettingsPage title="Daily goals" subtitle="what a good day looks like.">
      <Section title="Targets" hint={prefs.customGoals ? 'Custom targets. Tap "Use estimate" to return to the ones we calculated from your body metrics.' : 'Estimated from the height, weight, age and sex you gave us (Mifflin-St Jeor, light activity).'}>
        {GOAL_FIELDS.map((f, i) => (
          <Row
            key={f.key}
            label={f.label}
            last={i === GOAL_FIELDS.length - 1}
            right={
              <View style={styles.stepper}>
                <StepButton symbol="minus" onPress={() => bump(f.key, -1)} disabled={goals[f.key] <= f.min} label={`Decrease ${f.label}`} />
                <Text style={styles.stepperValue}>
                  {goals[f.key].toLocaleString()}
                  <Text style={styles.stepperUnit}> {f.unit}</Text>
                </Text>
                <StepButton symbol="plus" onPress={() => bump(f.key, 1)} disabled={goals[f.key] >= f.max} label={`Increase ${f.label}`} />
              </View>
            }
          />
        ))}
      </Section>

      <Section title="Estimation">
        <Row
          symbol="wand.and.stars"
          label="Use estimate"
          caption={estimate.estimated ? `Back to ${estimate.goals.kcal.toLocaleString()} kcal · ${estimate.goals.protein}g protein · ${estimate.goals.waterOz}oz water` : 'We need your height, weight and age to estimate — add them in Me.'}
          onPress={estimate.estimated ? () => preferencesStore.set({ customGoals: null }) : undefined}
          dim={!estimate.estimated}
          chevron={estimate.estimated}
          last
        />
      </Section>
    </SettingsPage>
  );
}

function StepButton({ symbol, onPress, disabled, label }: { symbol: 'plus' | 'minus'; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={[styles.stepButton, disabled && styles.stepButtonDim]}>
      <SymbolView name={symbol} size={13} weight="bold" tintColor={disabled ? 'rgba(242,242,244,0.3)' : '#F5F5F7'} fallback={<Text style={{ color: '#F5F5F7' }}>{symbol === 'plus' ? '+' : '−'}</Text>} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  stepButtonDim: { opacity: 0.5 },
  stepperValue: { minWidth: 74, textAlign: 'center', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  stepperUnit: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12 },
  accent: { color: Accent.primary },
});
