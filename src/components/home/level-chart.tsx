import { Canvas, Circle, DashPathEffect, Group, Line, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { Vial } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { Sheet } from '@/components/protocol/sheets';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundColor } from '@/lib/compounds';
import { doseEvents, pkProfile, RANGES, rangeWindow, series, type RangeId } from '@/lib/pk';
import { formatMg, formatRelative, formatTime, MONTHS, timeKeyFromDate, type CompoundSummary, type Schedule } from '@/lib/schedule';

type Props = {
  schedule: Schedule;
  summaries: CompoundSummary[];
  width: number;
  now: Date;
};

const CHART_H = 150;
const PAD = { top: 26, right: 12, bottom: 6, left: 12 };

/**
 * Estimated level over time for one tracked compound: solid, filled past from logged doses; a
 * dotted projection from the scheduled ones; a "Now" marker; drag to read any point. Only
 * compounds with a documented half-life get a curve — the rest say so.
 */
export function LevelChart({ schedule, summaries, width, now }: Props) {
  const tracked = summaries.filter((s) => s.compoundId);
  const [chosen, setChosen] = useState<string | null>(null);
  const [range, setRange] = useState<RangeId>('1D');
  const [picker, setPicker] = useState(false);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const compoundId = chosen && tracked.some((s) => s.compoundId === chosen) ? chosen : tracked[0]?.compoundId ?? null;
  const summary = tracked.find((s) => s.compoundId === compoundId);
  const compound = compoundId ? compoundById(compoundId) : undefined;
  const color = compound ? compoundColor(compound) : Accent.primary;
  const profile = compoundId ? pkProfile(compoundId) : null;

  // Plain calls: the React Compiler memoises these on their inputs.
  const model = profile && compoundId ? buildModel(schedule, compoundId, profile, range, now, width) : null;
  const scrub = model && scrubX != null ? pickPoint(model, scrubX, width) : null;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(120)
        .onBegin((e) => scheduleOnRN(setScrubX, e.x))
        .onUpdate((e) => scheduleOnRN(setScrubX, e.x))
        .onFinalize(() => scheduleOnRN(setScrubX, null)),
    [],
  );

  const explain = () =>
    Alert.alert(
      'How the level is estimated',
      `Each dose is modelled as absorbed then eliminated (a one-compartment model) using the documented elimination half-life${profile ? ` — ${describeHours(profile.halfLifeHours)} for ${compound?.name}` : ''} — and summed across your logged doses. The dotted part assumes you take the scheduled doses as planned. It's an estimate of the amount in the body, not a blood measurement.`,
    );

  if (!tracked.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <PressableScale onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={`Compound: ${summary?.title ?? ''}. Change`} hitSlop={6} style={styles.compound}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.compoundText} numberOfLines={1}>
            {summary?.title}
          </Text>
          <SymbolView name="chevron.down" size={10} weight="bold" tintColor="rgba(242,242,244,0.6)" fallback={null} />
        </PressableScale>
        <View style={styles.headerRight}>
          <PressableScale onPress={explain} accessibilityRole="button" accessibilityLabel="How this is estimated" hitSlop={8} style={styles.info}>
            <SymbolView name="info.circle" size={15} weight="medium" tintColor="rgba(242,242,244,0.6)" fallback={null} />
          </PressableScale>
        </View>
      </View>

      {model ? (
        <>
          <GestureDetector gesture={pan}>
            <View style={{ width, height: CHART_H }} accessible accessibilityLabel={`Estimated level of ${summary?.title}: ${formatMg(model.s.points[model.s.nowIndex].mg)} now; ${model.s.peakAhead ? `peaks ${formatRelative(new Date(model.s.peakAhead.t), now)} at ${formatMg(model.s.peakAhead.mg)}` : 'falling'}`}>
              <Canvas style={{ width, height: CHART_H }}>
                <Group>
                  <Path path={model.fill} color={color} opacity={0.18}>
                    <LinearGradient start={vec(0, PAD.top)} end={vec(0, CHART_H)} colors={[color, 'rgba(0,0,0,0)']} />
                  </Path>
                  <Path path={model.past} color={color} style="stroke" strokeWidth={2.2} strokeJoin="round" strokeCap="round" />
                  <Path path={model.future} color={color} style="stroke" strokeWidth={2} strokeCap="round" opacity={0.8}>
                    <DashPathEffect intervals={[3, 5]} />
                  </Path>
                  <Line p1={vec(model.nowX, PAD.top - 4)} p2={vec(model.nowX, CHART_H - PAD.bottom)} color="rgba(255,255,255,0.35)" strokeWidth={1}>
                    <DashPathEffect intervals={[3, 3]} />
                  </Line>
                  {scrub ? (
                    <>
                      <Line p1={vec(scrub.px, PAD.top - 4)} p2={vec(scrub.px, CHART_H - PAD.bottom)} color="rgba(255,255,255,0.5)" strokeWidth={1} />
                      <Circle cx={scrub.px} cy={scrub.py} r={6} color="#0B0F0D" />
                      <Circle cx={scrub.px} cy={scrub.py} r={6} color={color} style="stroke" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <Circle cx={model.nowX} cy={model.y(model.s.points[model.s.nowIndex].mg)} r={5} color="#0B0F0D" />
                      <Circle cx={model.nowX} cy={model.y(model.s.points[model.s.nowIndex].mg)} r={5} color={color} style="stroke" strokeWidth={2} />
                    </>
                  )}
                </Group>
              </Canvas>
              <Text style={[styles.axisMax, { left: PAD.left }]}>{formatMg(model.max)}</Text>
              <Text style={[styles.nowLabel, { left: Math.min(model.nowX + 4, width - 40) }]}>Now</Text>
              <View style={[styles.tooltip, { left: Math.min(Math.max((scrub?.px ?? model.nowX) - 58, 4), width - 120) }]} pointerEvents="none">
                <Text style={styles.tooltipValue}>{formatMg((scrub ?? model.s.points[model.s.nowIndex]).mg)}</Text>
                <Text style={styles.tooltipWhen}>{scrub ? formatStamp(new Date(scrub.t)) : model.s.peakAhead ? `Peaks ${formatRelative(new Date(model.s.peakAhead.t), now)}` : 'Estimated now'}</Text>
              </View>
            </View>
          </GestureDetector>
          <View style={styles.axis}>
            {model.labels.map((l, i) => (
              <Text key={i} style={[styles.axisText, { left: l.x - 30, textAlign: i === 0 ? 'left' : i === 3 ? 'right' : 'center' }, i === 0 && { left: PAD.left }, i === 3 && { left: undefined, right: PAD.right }]}>
                {l.text}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No documented half-life for {compound?.name ?? 'this compound'}</Text>
          <Text style={styles.emptyText}>We only draw a level curve when the elimination half-life is published. Guessing one would make the graph look precise without being true.</Text>
        </View>
      )}

      <View style={styles.ranges}>
        {RANGES.map((r) => (
          <PressableScale key={r.id} onPress={() => setRange(r.id)} accessibilityRole="button" accessibilityState={{ selected: range === r.id }} accessibilityLabel={`Range ${r.label}`} pressedScale={0.96} style={[styles.range, range === r.id && styles.rangeOn]}>
            <Text style={[styles.rangeText, range === r.id && styles.rangeTextOn]}>{r.label}</Text>
          </PressableScale>
        ))}
      </View>

      <Sheet open={picker} title="Compound" hint="Which level to chart." onClose={() => setPicker(false)}>
        <View style={styles.pickerList}>
          {tracked.map((s, i) => {
            const c = s.compoundId ? compoundById(s.compoundId) : undefined;
            const has = s.compoundId ? !!pkProfile(s.compoundId) : false;
            return (
              <PressableScale
                key={s.key}
                onPress={() => {
                  setChosen(s.compoundId);
                  setPicker(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: s.compoundId === compoundId }}
                accessibilityLabel={s.title}
                pressedScale={0.99}
                style={[styles.pickerRow, i < tracked.length - 1 && styles.pickerDivider]}>
                <Vial color={c ? compoundColor(c) : Accent.primary} size={32} />
                <View style={styles.pickerText}>
                  <Text style={[styles.pickerTitle, s.compoundId === compoundId && { color: Accent.primary }]} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text style={styles.pickerSub} numberOfLines={1}>
                    {has ? (s.levelMg != null ? `~${formatMg(s.levelMg)} now` : 'No doses yet') : 'No documented half-life'}
                    {s.lastAt ? ` · last dose ${formatRelative(s.lastAt, now)}` : ''}
                  </Text>
                </View>
                {s.compoundId === compoundId ? <SymbolView name="checkmark" size={14} weight="bold" tintColor={Accent.primary} fallback={null} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

type Model = ReturnType<typeof buildModel>;

function buildModel(schedule: Schedule, compoundId: string, profile: NonNullable<ReturnType<typeof pkProfile>>, range: RangeId, now: Date, width: number) {
  const nowMs = now.getTime();
  const events = doseEvents(schedule, compoundId, now);
  const { start, end } = rangeWindow(range, nowMs, events);
  const s = series(events, profile, start, end, nowMs, 200);
  const w = width - PAD.left - PAD.right;
  const h = CHART_H - PAD.top - PAD.bottom;
  const max = Math.max(s.maxMg, 1e-6);
  const x = (t: number) => PAD.left + ((t - start) / (end - start)) * w;
  const y = (mg: number) => PAD.top + h - (mg / max) * h;
  const past = Skia.PathBuilder.Make();
  const future = Skia.PathBuilder.Make();
  s.points.forEach((p, i) => {
    const px = x(p.t);
    const py = y(p.mg);
    if (i <= s.nowIndex) {
      if (i === 0) past.moveTo(px, py);
      else past.lineTo(px, py);
    }
    if (i >= s.nowIndex) {
      if (i === s.nowIndex) future.moveTo(px, py);
      else future.lineTo(px, py);
    }
  });
  const fill = Skia.PathBuilder.Make();
  const nowPoint = s.points[s.nowIndex];
  fill.moveTo(x(s.points[0].t), y(0));
  for (const p of s.points.slice(0, s.nowIndex + 1)) fill.lineTo(x(p.t), y(p.mg));
  fill.lineTo(x(nowPoint.t), y(0)).close();
  const labels = [0, 1 / 3, 2 / 3, 1].map((f) => ({ x: PAD.left + f * w, text: formatAxis(start + f * (end - start), range) }));
  return { s, x, y, past: past.build(), future: future.build(), fill: fill.build(), nowX: x(nowMs), labels, start, end, max, w, h };
}

function pickPoint(model: Model, scrubX: number, width: number) {
  const t = model.start + ((Math.min(Math.max(scrubX, PAD.left), width - PAD.right) - PAD.left) / model.w) * (model.end - model.start);
  let best = model.s.points[0];
  for (const p of model.s.points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  return { ...best, px: model.x(best.t), py: model.y(best.mg) };
}

function formatAxis(t: number, range: RangeId): string {
  const d = new Date(t);
  if (range === '4H' || range === '1D') return formatTime(timeKeyFromDate(d));
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

function formatStamp(d: Date): string {
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${formatTime(timeKeyFromDate(d))}`;
}

function describeHours(hours: number): string {
  return hours >= 48 ? `${Number((hours / 24).toFixed(hours % 24 ? 1 : 0))} days` : `${Number(hours.toFixed(1))} hours`;
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', paddingBottom: Spacing.three, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  compound: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', maxWidth: '70%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  compoundText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.2, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  info: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  axisMax: { position: 'absolute', top: 6, color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodyMedium, fontSize: 11, fontVariant: ['tabular-nums'] },
  nowLabel: { position: 'absolute', top: CHART_H - 20, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodyMedium, fontSize: 10 },
  tooltip: { position: 'absolute', top: 2, width: 116, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(14,18,16,0.92)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  tooltipValue: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  tooltipWhen: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 10.5 },
  axis: { height: 16, marginTop: 2 },
  axisText: { position: 'absolute', width: 60, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 10.5, fontVariant: ['tabular-nums'] },
  ranges: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.three, marginTop: Spacing.three },
  range: { flex: 1, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  rangeOn: { backgroundColor: 'rgba(52,211,153,0.16)' },
  rangeText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodySemiBold, fontSize: 12 },
  rangeTextOn: { color: Accent.primary },
  empty: { minHeight: CHART_H + 18, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: 6 },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2, textAlign: 'center' },
  emptyText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  pickerList: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: Spacing.two },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 60, paddingVertical: Spacing.two },
  pickerDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  pickerText: { flex: 1, gap: 2 },
  pickerTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  pickerSub: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
});
