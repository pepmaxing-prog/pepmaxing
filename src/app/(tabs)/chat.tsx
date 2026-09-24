import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Composer } from '@/components/chat/composer';
import { Message, Thinking } from '@/components/chat/message';
import { ChatGlyph } from '@/components/home/chat-glyph';
import { TAB_BAR_HEIGHT } from '@/components/home/floating-tab-bar';
import { PressableScale } from '@/components/pressable-scale';
import { Sheet } from '@/components/protocol/sheets';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { skillPrompt, type Context } from '@/lib/assistant/engine';
import { SKILLS, type Skill } from '@/lib/assistant/skills';
import { chatStore, useChat } from '@/lib/assistant/store';
import type { Conversation } from '@/lib/assistant/types';
import { useHealth } from '@/lib/health';
import { displayName, useOnboarding } from '@/lib/onboarding-store';
import { formatDayTitle, formatRelative, useSchedule } from '@/lib/schedule';

/**
 * The assistant. Empty state greets by name with the skills rail; a conversation is a plain
 * transcript (user bubbles, assistant text with cards and actions). Everything it says comes
 * from the library and the user's own data — see `src/lib/assistant/engine.ts`.
 */
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const onboarding = useOnboarding();
  const schedule = useSchedule();
  const health = useHealth();
  const { conversations, activeId, pending } = useChat();
  const conversation = conversations.find((c) => c.id === activeId) ?? null;
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<'skills' | 'history' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const keyboard = useKeyboardHeight();
  // The tab bar floats Spacing.one above the safe area; keep the same gap under the composer as
  // between the skills rail and the composer (Spacing.two).
  const bottomInset = Math.max(insets.bottom, Spacing.two) + Spacing.one + TAB_BAR_HEIGHT + Spacing.two;
  const composerStyle = useAnimatedStyle(() => ({ paddingBottom: keyboard.get() > 0 ? keyboard.get() + Spacing.two : bottomInset }));

  const ctx = useMemo<Context>(() => ({ schedule, health, onboarding, now: new Date() }), [schedule, health, onboarding]);
  const first = displayName(onboarding.name);
  const today = useMemo(() => new Date(), []);
  const messageCount = conversation?.messages.length ?? 0;
  useEffect(() => {
    if (messageCount || pending) scrollRef.current?.scrollToEnd({ animated: true });
  }, [messageCount, pending]);

  const send = (text: string) => {
    setDraft('');
    setSheet(null);
    void chatStore.send(text, { ...ctx, now: new Date() });
  };
  const runSkill = (s: Skill) => send(skillPrompt(s.id, ctx) ?? s.prompt);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.18 }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.one }]}>
        <PressableScale onPress={() => setSheet('history')} accessibilityRole="button" accessibilityLabel="Conversations" hitSlop={8} style={styles.headerButton}>
          <SymbolView name="line.3.horizontal" size={19} weight="medium" tintColor="#F5F5F7" fallback={null} />
        </PressableScale>
        {conversation ? (
          <PressableScale onPress={() => chatStore.newChat()} accessibilityRole="button" accessibilityLabel="New chat" hitSlop={6} style={styles.newChat}>
            <SymbolView name="plus" size={12} weight="bold" tintColor="#F5F5F7" fallback={null} />
            <Text style={styles.newChatText}>New chat</Text>
          </PressableScale>
        ) : (
          <View style={styles.brandRow}>
            <ChatGlyph size={18} color={Accent.primary} filled />
            <Text style={styles.brandText}>{Brand.name} AI</Text>
          </View>
        )}
        <View style={styles.headerButton} />
      </View>

      <ScrollView ref={scrollRef} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, !conversation && styles.scrollEmpty]}>
        {conversation ? (
          <>
            <View style={styles.dayPill}>
              <Text style={styles.dayPillText}>{formatDayTitle(new Date(conversation.createdAt)) === formatDayTitle(today) ? 'Today' : formatDayTitle(new Date(conversation.createdAt))}</Text>
            </View>
            {conversation.messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {pending ? <Thinking status={pending} /> : null}
          </>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.greeting}>
            <Text style={styles.date}>{formatDayTitle(today)}</Text>
            <Text style={styles.hello}>{first ? `Hi ${first}` : 'Hi there'}</Text>
            <Text style={styles.question}>What would you like to do today?</Text>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View style={[styles.bottom, composerStyle]}>
        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.rail}>
            {SKILLS.map((s) => (
              <PressableScale key={s.id} onPress={() => runSkill(s)} accessibilityRole="button" accessibilityLabel={`${s.title}. ${s.subtitle}`} pressedScale={0.97} style={styles.chip}>
                <SymbolView name={s.symbol} size={14} weight="semibold" tintColor={Accent.primary} fallback={null} />
                <View>
                  <Text style={styles.chipTitle}>{s.title}</Text>
                  <Text style={styles.chipSub} numberOfLines={1}>
                    {s.subtitle}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </ScrollView>
        </Animated.View>
        <View style={styles.composer}>
          <Composer value={draft} onChange={setDraft} onSend={() => send(draft)} onPlus={() => setSheet('skills')} busy={!!pending} />
        </View>
      </Animated.View>

      <Sheet open={sheet === 'skills'} title="Skills" hint="Everything the assistant can do. Tap one to start." onClose={() => setSheet(null)}>
        <View style={styles.sheetList}>
          {SKILLS.map((s, i) => (
            <PressableScale key={s.id} onPress={() => runSkill(s)} accessibilityRole="button" accessibilityLabel={`${s.title}. ${s.subtitle}`} pressedScale={0.99} style={[styles.sheetRow, i < SKILLS.length - 1 && styles.sheetDivider]}>
              <View style={styles.sheetIcon}>
                <SymbolView name={s.symbol} size={15} weight="semibold" tintColor={Accent.primary} fallback={null} />
              </View>
              <View style={styles.sheetText}>
                <Text style={styles.sheetTitle}>{s.title}</Text>
                <Text style={styles.sheetSub}>{s.subtitle}</Text>
              </View>
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <Sheet open={sheet === 'history'} title="Conversations" hint={conversations.length ? undefined : 'Your chats will be kept here on this device.'} onClose={() => setSheet(null)}>
        <HistoryList
          conversations={conversations}
          activeId={activeId}
          onOpen={(id) => {
            chatStore.open(id);
            setSheet(null);
          }}
          onNew={() => {
            chatStore.newChat();
            setSheet(null);
          }}
        />
      </Sheet>
    </View>
  );
}

function HistoryList({ conversations, activeId, onOpen, onNew }: { conversations: Conversation[]; activeId: string | null; onOpen: (id: string) => void; onNew: () => void }) {
  const now = new Date();
  return (
    <View style={styles.sheetList}>
      <PressableScale onPress={onNew} accessibilityRole="button" accessibilityLabel="New chat" pressedScale={0.99} style={[styles.sheetRow, styles.sheetDivider]}>
        <View style={[styles.sheetIcon, styles.sheetIconAccent]}>
          <SymbolView name="plus" size={15} weight="bold" tintColor="#062B1F" fallback={null} />
        </View>
        <Text style={styles.sheetTitle}>New chat</Text>
      </PressableScale>
      {conversations.slice(0, 12).map((c, i) => (
        <View key={c.id} style={[styles.sheetRow, i < Math.min(conversations.length, 12) - 1 && styles.sheetDivider]}>
          <PressableScale onPress={() => onOpen(c.id)} accessibilityRole="button" accessibilityLabel={c.title} pressedScale={0.99} style={styles.historyMain}>
            <View style={styles.sheetText}>
              <Text style={[styles.sheetTitle, c.id === activeId && { color: Accent.primary }]} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={styles.sheetSub}>
                {c.messages.length} message{c.messages.length === 1 ? '' : 's'} · {formatRelative(new Date(c.updatedAt), now)}
              </Text>
            </View>
          </PressableScale>
          <PressableScale onPress={() => chatStore.remove(c.id)} accessibilityRole="button" accessibilityLabel={`Delete ${c.title}`} hitSlop={8} style={styles.trash}>
            <SymbolView name="trash" size={14} weight="medium" tintColor="rgba(242,242,244,0.45)" fallback={null} />
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.two, paddingBottom: Spacing.one },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
  newChat: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 13, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  newChatText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5 },
  scroll: { paddingHorizontal: AppGutter, paddingTop: Spacing.two, paddingBottom: Spacing.four, flexGrow: 1 },
  scrollEmpty: { justifyContent: 'center' },
  greeting: { alignItems: 'center', gap: 6, paddingBottom: Spacing.six },
  date: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13.5 },
  hello: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 34, letterSpacing: -1 },
  question: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 15 },
  dayPill: { alignSelf: 'center', paddingHorizontal: 12, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three },
  dayPillText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 12 },
  bottom: { gap: Spacing.two, paddingTop: Spacing.one, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 18%, #000 40%)' },
  rail: { paddingHorizontal: AppGutter, gap: Spacing.one },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 50, paddingLeft: 12, paddingRight: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  chipTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13, letterSpacing: -0.1 },
  chipSub: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11 },
  composer: { paddingHorizontal: AppGutter },
  sheetList: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: Spacing.two },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 56, paddingVertical: Spacing.one + Spacing.half },
  sheetDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  sheetIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  sheetIconAccent: { backgroundColor: Accent.primary },
  sheetText: { flex: 1, gap: 1 },
  sheetTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  sheetSub: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  historyMain: { flex: 1 },
  trash: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
