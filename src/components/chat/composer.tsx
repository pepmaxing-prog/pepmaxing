import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { PLACEHOLDERS } from '@/lib/assistant/skills';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onPlus: () => void;
  busy: boolean;
};

/** "+" for skills, a growing text field with a rotating hint, and the send arrow. */
export function Composer({ value, onChange, onSend, onPlus, busy }: Props) {
  const [hint, setHint] = useState(0);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (value || focused) return;
    const t = setInterval(() => setHint((h) => (h + 1) % PLACEHOLDERS.length), 3600);
    return () => clearInterval(t);
  }, [value, focused]);
  const canSend = value.trim().length > 0 && !busy;

  return (
    <View style={styles.row}>
      <PressableScale onPress={onPlus} accessibilityRole="button" accessibilityLabel="Skills and shortcuts" hitSlop={6} style={styles.plus}>
        <SymbolView name="plus" size={18} weight="semibold" tintColor="#F5F5F7" fallback={null} />
      </PressableScale>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          maxLength={600}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => canSend && onSend()}
          placeholder={focused ? 'Ask anything…' : PLACEHOLDERS[hint]}
          placeholderTextColor="rgba(242,242,244,0.4)"
          style={styles.input}
          accessibilityLabel="Message"
        />
        {busy ? (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={[styles.send, styles.sendBusy]}>
            <ActivityIndicator size="small" color={Accent.primary} />
          </Animated.View>
        ) : (
          <PressableScale onPress={onSend} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send" hitSlop={6} style={[styles.send, !canSend && styles.sendOff]}>
            <SymbolView name="arrow.up" size={15} weight="bold" tintColor={canSend ? '#062B1F' : 'rgba(242,242,244,0.45)'} fallback={null} />
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one + Spacing.half },
  plus: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, minHeight: 46, maxHeight: 132, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: Spacing.three, paddingRight: 5, paddingVertical: 5, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  fieldFocused: { borderColor: 'rgba(52,211,153,0.5)', backgroundColor: 'rgba(255,255,255,0.09)' },
  input: { flex: 1, paddingTop: 9, paddingBottom: 9, color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15.5, lineHeight: 20 },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: 'rgba(255,255,255,0.1)' },
  sendBusy: { backgroundColor: 'rgba(52,211,153,0.14)' },
});
