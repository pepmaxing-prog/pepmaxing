import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Section, SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const MAX = 4000;

/** "Submit feedback" — writes to the feedback table when signed in; otherwise keeps a local note of the failure. */
export default function FeedbackScreen() {
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    const text = message.trim();
    if (!text || state === 'sending') return;
    Keyboard.dismiss();
    setState('sending');
    try {
      if (!supabaseConfigured) throw new Error('not configured');
      const { data } = await supabase().auth.getSession();
      if (!data.session) throw new Error('not signed in');
      const { error } = await supabase()
        .from('feedback')
        .insert({ user_id: data.session.user.id, message: text, app_version: Constants.expoConfig?.version ?? null });
      if (error) throw error;
      setMessage('');
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <SettingsPage title="Feedback" subtitle="tell us what is working and what is not." footer={state !== 'sent' ? <ShineButton label={state === 'sending' ? 'Sending…' : 'Send feedback'} onPress={send} disabled={!message.trim() || state === 'sending'} /> : null}>
      {state === 'sent' ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.thanks}>
          <View style={styles.thanksDisc}>
            <SymbolView name="checkmark" size={24} weight="bold" tintColor="#062B1F" fallback={<Text>✓</Text>} />
          </View>
          <Text style={styles.thanksTitle}>Thank you.</Text>
          <Text style={styles.thanksText}>We read every message — it shapes what we build next.</Text>
        </Animated.View>
      ) : (
        <Section title="Message" hint="Screenshots help too — attach them to a follow-up email once Contact us is live.">
          <View style={styles.inputWrap}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MAX}
              placeholder="What would make Pepmaxing better for you?"
              placeholderTextColor="rgba(242,242,244,0.35)"
              style={styles.input}
              accessibilityLabel="Feedback message"
            />
            <Text style={styles.count}>{message.length}/{MAX}</Text>
          </View>
          {state === 'error' ? <Text style={styles.error}>Could not send{supabaseConfigured ? ' — are you signed in?' : ' in this build'}. Try again in a moment.</Text> : null}
        </Section>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  inputWrap: { padding: Spacing.three },
  input: { minHeight: 150, textAlignVertical: 'top', color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15, lineHeight: 21 },
  count: { alignSelf: 'flex-end', marginTop: Spacing.one, color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.body, fontSize: 11.5 },
  error: { marginTop: Spacing.two, marginLeft: Spacing.one, color: '#F87171', fontFamily: Typeface.body, fontSize: 12.5 },
  thanks: { marginTop: Spacing.six, alignItems: 'center', gap: Spacing.two },
  thanksDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  thanksTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 26, letterSpacing: -0.6 },
  thanksText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
