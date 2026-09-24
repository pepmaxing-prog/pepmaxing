import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';

export const RED = '#F87171';

/** Back chevron, small centred title and an optional right-hand control — shared by every pushed page. */
export function PageHeader({ title, right, onBack, close }: { title: string; right?: ReactNode; onBack?: () => void; /** Show × on the right instead of ‹ on the left (for screens that slide up). */ close?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dismiss = onBack ?? (() => router.back());
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      {close ? (
        <View style={styles.iconButton}>{right}</View>
      ) : (
        <PressableScale onPress={dismiss} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={styles.iconButton}>
          <SymbolView name="chevron.left" size={18} weight="medium" tintColor="#F5F5F7" fallback={<Text style={styles.glyph}>‹</Text>} />
        </PressableScale>
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {close ? (
        <PressableScale onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.iconButton}>
          <SymbolView name="xmark" size={15} weight="semibold" tintColor="#F5F5F7" fallback={<Text style={styles.glyph}>×</Text>} />
        </PressableScale>
      ) : (
        <View style={styles.iconButton}>{right}</View>
      )}
    </View>
  );
}

/** Full-screen settings page: back chevron, small centred title, large title + subtitle, scrolling body. */
export function SettingsPage({ title, subtitle, children, right, footer }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.15 }} />
      <PageHeader title={title} right={right} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: AppGutter, paddingBottom: Math.max(insets.bottom, Spacing.three) + (footer ? 96 : Spacing.four) }}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>{footer}</View> : null}
    </View>
  );
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.card}>{children}</View>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

type RowProps = {
  symbol?: SFSymbol;
  label: string;
  value?: string;
  caption?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  tone?: 'danger';
  dim?: boolean;
  last?: boolean;
};

export function Row({ symbol, label, value, caption, right, onPress, chevron, tone, dim, last }: RowProps) {
  const color = tone === 'danger' ? RED : '#F2F2F4';
  const content = (
    <View style={[styles.row, !last && styles.rowDivider, dim && styles.rowDim]}>
      {symbol ? (
        <View style={[styles.rowIcon, tone === 'danger' && styles.rowIconDanger]}>
          <SymbolView name={symbol} size={14} weight="semibold" tintColor={tone === 'danger' ? RED : Accent.primary} fallback={<View style={styles.rowIconFallback} />} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {caption ? (
          <Text style={styles.rowCaption} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right ??
        (value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null)}
      {chevron ? <SymbolView name="chevron.right" size={12} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} pressedScale={0.99}>
      {content}
    </PressableScale>
  );
}

export function ToggleRow({ label, caption, value, onChange, disabled, last }: { label: string; caption?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  return (
    <Row
      label={label}
      caption={caption}
      last={last}
      dim={disabled}
      right={<Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: Accent.primary, false: 'rgba(255,255,255,0.14)' }} thumbColor="#F5F5F7" ios_backgroundColor="rgba(255,255,255,0.14)" />}
    />
  );
}

/** Radio-style choice row (check on the right when selected). */
export function ChoiceRowItem({ label, caption, selected, onPress, last }: { label: string; caption?: string; selected: boolean; onPress: () => void; last?: boolean }) {
  return (
    <Row
      label={label}
      caption={caption}
      onPress={onPress}
      last={last}
      right={selected ? <SymbolView name="checkmark" size={14} weight="bold" tintColor={Accent.primary} fallback={<Text style={{ color: Accent.primary }}>✓</Text>} /> : null}
    />
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.one, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#F5F5F7', fontSize: 22 },
  headerTitle: { flex: 1, textAlign: 'center', color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  title: { marginTop: Spacing.two, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 30, letterSpacing: -0.9 },
  subtitle: { marginTop: 4, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14.5, letterSpacing: -0.1 },
  section: { marginTop: Spacing.four },
  sectionTitle: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1, marginBottom: Spacing.one + Spacing.half, marginLeft: Spacing.one },
  sectionHint: { marginTop: Spacing.one + Spacing.half, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.42)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  card: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 54, paddingVertical: Spacing.one + Spacing.half },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowDim: { opacity: 0.5 },
  rowIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: 'rgba(248,113,113,0.12)' },
  rowIconFallback: { width: 10, height: 10, borderRadius: 5, backgroundColor: Accent.primary },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.2 },
  rowCaption: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  rowValue: { maxWidth: '50%', color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13.5 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: AppGutter, paddingTop: Spacing.two, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 40%, #000 100%)' },
});
