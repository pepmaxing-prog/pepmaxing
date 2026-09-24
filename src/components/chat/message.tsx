import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { ChatGlyph } from '@/components/home/chat-glyph';
import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { chatStore } from '@/lib/assistant/store';
import type { Card, ChatMessage } from '@/lib/assistant/types';
import { formatTime, timeKeyFromDate } from '@/lib/schedule';

const AMBER = '#FBBF24';
const RED = '#F87171';

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <Animated.View entering={FadeInUp.duration(260)} style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(320)} style={styles.assistant}>
      <RichText text={message.text} />
      {message.cards?.map((card, i) => <CardView key={i} card={card} />)}
      {message.disclaimer ? <Text style={styles.disclaimer}>{message.disclaimer}</Text> : null}
      {message.actions?.length ? (
        <View style={styles.actions}>
          {message.actions.map((a) => (
            <ActionButton key={a.href + a.label} label={a.label} href={a.href} />
          ))}
        </View>
      ) : null}
      <View style={styles.footer}>
        <PressableScale onPress={() => chatStore.feedback(message.id, 'up')} accessibilityRole="button" accessibilityLabel="Helpful" accessibilityState={{ selected: message.feedback === 'up' }} hitSlop={8} style={styles.footerButton}>
          <SymbolView name={message.feedback === 'up' ? 'hand.thumbsup.fill' : 'hand.thumbsup'} size={14} weight="medium" tintColor={message.feedback === 'up' ? Accent.primary : 'rgba(242,242,244,0.45)'} fallback={null} />
        </PressableScale>
        <PressableScale onPress={() => chatStore.feedback(message.id, 'down')} accessibilityRole="button" accessibilityLabel="Not helpful" accessibilityState={{ selected: message.feedback === 'down' }} hitSlop={8} style={styles.footerButton}>
          <SymbolView name={message.feedback === 'down' ? 'hand.thumbsdown.fill' : 'hand.thumbsdown'} size={14} weight="medium" tintColor={message.feedback === 'down' ? RED : 'rgba(242,242,244,0.45)'} fallback={null} />
        </PressableScale>
        <Text style={styles.time}>{formatTime(timeKeyFromDate(new Date(message.at)))}</Text>
      </View>
    </Animated.View>
  );
}

/** Paragraphs with **bold** runs. */
function RichText({ text }: { text: string }) {
  return (
    <View style={styles.paragraphs}>
      {text.split(/\n\n+/).map((para, i) => (
        <Text key={i} style={styles.assistantText}>
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <Text key={j} style={styles.bold}>
                {part.slice(2, -2)}
              </Text>
            ) : (
              part
            ),
          )}
        </Text>
      ))}
    </View>
  );
}

function ActionButton({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  return (
    <PressableScale onPress={() => router.push(href as Href)} accessibilityRole="button" accessibilityLabel={label} pressedScale={0.98} style={styles.action}>
      <SymbolView name="arrow.up.right" size={11} weight="bold" tintColor="#F5F5F7" fallback={<Text style={styles.actionGlyph}>↗</Text>} />
      <Text style={styles.actionText}>{label}</Text>
    </PressableScale>
  );
}

function CardView({ card }: { card: Card }) {
  const router = useRouter();
  switch (card.kind) {
    case 'research':
      return (
        <View style={[styles.card, { borderLeftColor: card.color, borderLeftWidth: 3 }]}>
          <Text style={styles.cardTitle}>{card.name}</Text>
          <Text style={[styles.cardStatus, { color: card.color }]}>{card.statusLabel}</Text>
          <Text style={styles.cardBody}>{card.blurb}</Text>
          {card.studiedFor.length ? <Text style={styles.cardMeta}>Studied for: {card.studiedFor.join(' · ')}</Text> : null}
          <View style={styles.sources}>
            {card.sources.map((s) => (
              <PressableScale key={s.url} onPress={() => Linking.openURL(s.url).catch(() => {})} accessibilityRole="link" accessibilityLabel={s.label} hitSlop={4} style={styles.source}>
                <SymbolView name="arrow.up.right" size={9} weight="bold" tintColor="#7DD3FC" fallback={null} />
                <Text style={styles.sourceText} numberOfLines={1}>
                  {s.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      );
    case 'recon':
      return (
        <View style={styles.card}>
          <View style={styles.reconHero}>
            <Text style={styles.reconUnits}>
              {Number(card.units.toFixed(1))}
              <Text style={styles.reconUnitsLabel}> units</Text>
            </Text>
            <Text style={styles.cardMeta}>draw for {card.doseLabel}</Text>
          </View>
          <View style={styles.reconFacts}>
            <Fact label="VIAL" value={`${card.vialMg} mg`} />
            <Fact label="WATER" value={`${card.waterMl} mL`} />
            <Fact label="CONC." value={`${Number(card.mgPerMl.toFixed(3))} mg/mL`} />
            <Fact label="VOLUME" value={`${card.ml.toFixed(2)} mL`} />
          </View>
          {card.warning ? <Text style={[styles.cardMeta, { color: AMBER }]}>{card.warning}</Text> : null}
        </View>
      );
    case 'insight':
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          {card.rows.map((r, i) => (
            <View key={i} style={[styles.insightRow, i < card.rows.length - 1 && styles.insightDivider]}>
              <Text style={styles.insightLabel}>{r.label}</Text>
              <Text style={[styles.insightValue, r.tone === 'good' && { color: Accent.primary }, r.tone === 'warn' && { color: AMBER }, r.tone === 'muted' && { color: 'rgba(242,242,244,0.6)' }]} numberOfLines={1} adjustsFontSizeToFit>
                {r.value}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'stack':
      return (
        <View style={styles.stack}>
          {card.protocols.map((p) => (
            <View key={p.id} style={[styles.card, { borderLeftColor: p.color, borderLeftWidth: 3 }]}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              {p.lines.map((l, i) => (
                <Text key={i} style={styles.cardBody}>
                  {l}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case 'doses':
      return (
        <View style={styles.stack}>
          {card.doses.map((d) => (
            <PressableScale key={d.id} onPress={() => router.push({ pathname: '/log/[id]', params: { id: d.id } })} accessibilityRole="button" accessibilityLabel={`${d.logged ? 'Edit' : 'Log'} ${d.title} ${d.amount}`} pressedScale={0.985} style={styles.doseRow}>
              <View style={styles.doseText}>
                <Text style={styles.cardTitle}>{d.title}</Text>
                <Text style={styles.cardMeta}>
                  {d.amount} · {d.time}
                </Text>
              </View>
              {d.logged ? (
                <SymbolView name="checkmark.circle.fill" size={18} weight="semibold" tintColor={Accent.primary} fallback={null} />
              ) : (
                <View style={styles.logPill}>
                  <Text style={styles.logText}>Log</Text>
                </View>
              )}
            </PressableScale>
          ))}
        </View>
      );
  }
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/** The pulsing status line shown while the assistant works. */
export function Thinking({ status }: { status: string }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.thinking} accessibilityLiveRegion="polite">
      <View style={styles.thinkingMark}>
        <ChatGlyph size={14} color={Accent.primary} filled />
      </View>
      <Pulse text={status} />
    </Animated.View>
  );
}

function Pulse({ text }: { text: string }) {
  return (
    <Animated.Text key={text} entering={FadeIn.duration(200)} style={styles.thinkingText}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', marginBottom: Spacing.three },
  userBubble: { maxWidth: '82%', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: 'rgba(52,211,153,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.35)' },
  userText: { color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15.5, lineHeight: 21 },
  assistant: { marginBottom: Spacing.four, gap: Spacing.two + Spacing.half },
  paragraphs: { gap: Spacing.two },
  assistantText: { color: 'rgba(245,245,247,0.92)', fontFamily: Typeface.body, fontSize: 15.5, lineHeight: 23 },
  bold: { fontFamily: Typeface.bodySemiBold, color: '#F5F5F7' },
  disclaimer: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  actionGlyph: { color: '#F5F5F7', fontSize: 12 },
  actionText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  footerButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  time: { marginLeft: 'auto', color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.body, fontSize: 11.5 },
  card: { padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: 6 },
  cardTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15.5, letterSpacing: -0.3 },
  cardStatus: { fontFamily: Typeface.bodySemiBold, fontSize: 11.5, letterSpacing: 0.2, marginTop: -2 },
  cardBody: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19 },
  cardMeta: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  sources: { gap: 4, marginTop: 2 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24 },
  sourceText: { flex: 1, color: '#7DD3FC', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  reconHero: { alignItems: 'center', gap: 2, paddingVertical: Spacing.one },
  reconUnits: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  reconUnitsLabel: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 16, letterSpacing: 0 },
  reconFacts: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one, paddingTop: Spacing.one },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  factLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 9.5, letterSpacing: 0.9 },
  factValue: { color: '#F2F2F4', fontFamily: Typeface.bodySemiBold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  insightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: 7 },
  insightDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  insightLabel: { flex: 1, color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 13 },
  insightValue: { maxWidth: '58%', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, fontVariant: ['tabular-nums'], textAlign: 'right' },
  stack: { gap: Spacing.one + Spacing.half },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  doseText: { flex: 1, gap: 2 },
  logPill: { height: 30, paddingHorizontal: 13, borderRadius: 15, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  logText: { color: '#062B1F', fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  thinkingMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  thinkingText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 14 },
});
