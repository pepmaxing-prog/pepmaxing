import { Brand } from '@/constants/brand';

import { compoundById, compoundColor, COMPOUNDS, halfLifeHours, type Compound } from '../compounds';
import { latest, toDisplay, type HealthEntry } from '../health';
import type { OnboardingState } from '../onboarding-store';
import { peptideById, STATUS_LABEL, type Peptide } from '../peptides';
import { compoundSummaries, currentStreak, describeFrequency, dosesOn, drawUnits, formatDose, formatMg, formatRelative, formatTime, openDosesToday, siteHistory, type Schedule } from '../schedule';
import { kindFor, siteById, suggestSite } from '../sites';
import type { Action, Reply, ResearchCard } from './types';

export type Context = {
  schedule: Schedule;
  health: HealthEntry[];
  onboarding: OnboardingState;
  now: Date;
};

export const DISCLAIMER = `This is educational information, not a personal recommendation. ${Brand.name} doesn't give dosing, protocol or administration guidance — talk to your prescriber before any of those decisions.`;

const ACT = {
  library: (id?: string): Action => (id ? { label: 'Open in Library', href: `/peptide/${id}`, symbol: 'books.vertical' } : { label: 'Open Library', href: '/(tabs)/library', symbol: 'books.vertical' }),
  calculator: { label: 'Open reconstitution calculator', href: '/calculator', symbol: 'function' } as Action,
  newProtocol: (compound?: string): Action => ({ label: compound ? 'Add to a protocol' : 'Create a protocol', href: compound ? `/protocol/new?compound=${compound}` : '/protocol/new', symbol: 'list.clipboard.fill' }),
  logDose: { label: 'Log a dose', href: '/log', symbol: 'checkmark.circle.fill' } as Action,
  history: { label: 'Dose history', href: '/history', symbol: 'list.bullet' } as Action,
  health: (metric = 'weight'): Action => ({ label: `Log ${metric === 'bodyFat' ? 'body fat' : metric}`, href: `/health/${metric}`, symbol: 'scalemass.fill' }),
  settings: { label: 'Open Settings', href: '/settings', symbol: 'gearshape' } as Action,
  notifications: { label: 'Notification settings', href: '/settings/notifications', symbol: 'bell.fill' } as Action,
  goals: { label: 'Daily goals', href: '/settings/goals', symbol: 'target' } as Action,
  home: { label: 'Go to Home', href: '/(tabs)/home', symbol: 'house.fill' } as Action,
};

// ---- matching ---------------------------------------------------------------------------------

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (text: string, re: RegExp) => re.test(text);

/** Compounds the message talks about — full names, brand names, and 4+ letter prefixes ("reta"). */
export function mentionedCompounds(text: string): Compound[] {
  const words = norm(text).split(' ').filter(Boolean);
  const found = new Map<string, Compound>();
  for (const c of COMPOUNDS) {
    // A blend only counts when named as such — "BPC-157" should not surface every stack containing it.
    const names = (c.kind === 'blend' ? [c.name] : [c.name, ...(c.aka ? c.aka.split(/[,/·]/) : [])]).map(norm).filter((n) => n.length >= 3);
    const peptide = c.peptideId ? peptideById(c.peptideId) : undefined;
    if (peptide?.nickname && c.kind !== 'blend') names.push(norm(peptide.nickname));
    const hay = ` ${norm(text)} `;
    const hit = names.some((n) => hay.includes(` ${n} `) || (n.includes('-') && hay.includes(` ${n.replace(/-/g, ' ')} `) || hay.includes(` ${n.replace(/-/g, '')} `)));
    const stems = names.map((n) => n.split(/[- ]/)[0]);
    const prefix = words.some((w) => !COMMON.has(w) && ((w.length >= 4 && stems.some((st) => st.startsWith(w) && st.length - w.length <= 8)) || (w.length >= 3 && stems.some((st) => st === w))));
    if (!hit && !prefix) continue;
    const key = c.peptideId ?? c.id;
    const existing = found.get(key);
    // One card per active compound; the library peptide wins over its brands.
    if (!existing || (c.kind === 'peptide' && existing.kind !== 'peptide')) found.set(key, c);
  }
  // Prefer the library peptide over a brand when both matched the same active compound.
  return [...found.values()].sort((a, b) => (a.kind === 'peptide' ? 0 : 1) - (b.kind === 'peptide' ? 0 : 1)).slice(0, 3);
}

const COMMON = new Set(['what', 'when', 'where', 'which', 'this', 'that', 'with', 'from', 'have', 'take', 'dose', 'doses', 'vial', 'water', 'should', 'about', 'tell', 'help', 'show', 'give', 'need', 'want', 'like', 'much', 'many', 'next', 'last', 'week', 'today', 'time', 'site', 'inject', 'injection', 'protocol', 'stack', 'research', 'insulin', 'mine', 'more', 'less', 'does', 'make', 'unit', 'units', 'draw', 'mixing', 'level', 'weight', 'body', 'food', 'meal', 'scan', 'photo', 'hello', 'thanks', 'thank', 'please', 'again', 'start', 'reconstitute', 'reconstitution', 'bacteriostatic', 'calculator', 'schedule', 'reminder', 'account', 'setting', 'settings', 'where', 'which', 'inject', 'currently', 'running', 'taking', 'protocols', 'compounds', 'peptides', 'doing', 'recently', 'changed']);

// ---- research ---------------------------------------------------------------------------------

/** Hermes has no regex look-behind, so split on the sentence boundary by hand. */
const firstSentence = (text: string) => {
  const i = text.search(/\.\s/);
  return i === -1 ? text : text.slice(0, i + 1);
};

const routeSentence = (p: Peptide) => {
  switch (p.route) {
    case 'Subcutaneous':
      return 'a subcutaneous injectable — like other peptides in its class it is typically injected just under the skin (common sites: abdomen, thigh, back of the upper arm)';
    case 'Intramuscular':
      return 'an intramuscular injectable — given into muscle rather than under the skin';
    case 'Oral':
      return 'taken orally';
    case 'Nasal':
      return 'a nasal spray';
    case 'Topical':
      return 'applied to the skin';
  }
};

function researchCard(c: Compound): ResearchCard {
  const p = c.peptideId ? peptideById(c.peptideId) : undefined;
  const term = encodeURIComponent(p?.name ?? c.name);
  const name = p?.name ?? c.name;
  return {
    kind: 'research',
    compoundId: c.id,
    peptideId: p?.id,
    name,
    statusLabel: p ? STATUS_LABEL[p.status] : c.kind === 'brand' ? 'Brand · see active compound' : c.kind === 'vitamin' ? 'Supplement' : 'Tracked compound',
    color: compoundColor(c),
    blurb: p ? p.overview : c.aka ? `${c.name} (${c.aka}). We track it, but there is no written library entry yet.` : `We track ${c.name}, but there is no written library entry yet.`,
    studiedFor: p ? p.tags.slice(0, 4) : [],
    sources: [
      { label: `PubMed: ${name} research articles`, url: `https://pubmed.ncbi.nlm.nih.gov/?term=${term}` },
      { label: `ClinicalTrials.gov: ${name} trials`, url: `https://clinicaltrials.gov/search?term=${term}` },
      { label: `PMC: ${name} full-text studies`, url: `https://pmc.ncbi.nlm.nih.gov/search/?term=${term}` },
    ],
  };
}

function researchReply(compounds: Compound[], text: string, ctx: Context): Reply {
  const first = compounds[0];
  const p = first.peptideId ? peptideById(first.peptideId) : undefined;
  const wantsSafety = has(text, /safe|side effect|risk|danger|interact|contraindic/);
  const wantsHow = has(text, /how (do|to|should) (i )?(use|take|inject|dose|run)|how much|dosage|dosing|what dose|how often/);
  const active = ctx.schedule.protocols.some((pr) => pr.items.some((i) => i.compoundIds.includes(first.id) || (first.peptideId && i.compoundIds.some((cid) => compoundById(cid)?.peptideId === first.peptideId))));

  let intro: string;
  if (p) {
    const status = p.status === 'approved' ? `an approved medicine${p.aka ? ` (${p.aka})` : ''}` : p.status === 'research' ? 'a research compound without approval for human use' : 'sold as a supplement';
    intro = `${p.name} is ${routeSentence(p)}, and ${status}. ${firstSentence(p.mechanism)}`;
    if (wantsSafety) intro += `\n\nOn safety: ${p.evidence}`;
    if (wantsHow) intro += `\n\nI can't give you a dose or a schedule — that has to come from your prescriber. What I can do is show the research, and once you have a plan, do the reconstitution math and keep the schedule for you.`;
    if (active) intro += `\n\nYou are already tracking it — say "show my stack" for your schedule.`;
    intro += `\n\nHere's what the library has on it:`;
  } else {
    intro = first.kind === 'brand' ? `${first.name} is a brand of ${first.aka ?? 'a tracked compound'}. Here's what I have:` : `Here's what I have on ${first.name}:`;
  }

  const actions: Action[] = [ACT.library(p?.id)];
  if (p && (p.route === 'Subcutaneous' || p.route === 'Intramuscular')) actions.push(ACT.calculator);
  if (!active) actions.push(ACT.newProtocol(first.id));
  return {
    statuses: ['Thinking', 'Checking the research library…'],
    text: intro,
    cards: compounds.map(researchCard),
    actions,
    disclaimer: DISCLAIMER,
  };
}

// ---- reconstitution ---------------------------------------------------------------------------

function parseRecon(text: string) {
  const t = norm(text).replace(/µg|ug/g, 'mcg').replace(/millilit(er|re)s?/g, 'ml').replace(/milligrams?/g, 'mg').replace(/micrograms?/g, 'mcg');
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|ml|iu)\b/g)].map((m) => ({ value: Number(m[1]), unit: m[2], index: m.index ?? 0 }));
  const ml = nums.find((n) => n.unit === 'ml');
  const mcg = nums.find((n) => n.unit === 'mcg');
  const mgs = nums.filter((n) => n.unit === 'mg');
  let vialMg: number | undefined;
  let doseMg: number | undefined;
  if (mgs.length >= 2) {
    const sorted = [...mgs].sort((a, b) => b.value - a.value);
    vialMg = sorted[0].value;
    doseMg = sorted[sorted.length - 1].value;
  } else if (mgs.length === 1) {
    const near = t.slice(Math.max(0, mgs[0].index - 12), mgs[0].index + 12);
    if (mcg || /vial|bottle|powder/.test(near) || mgs[0].value >= 2) vialMg = mgs[0].value;
    else doseMg = mgs[0].value;
  }
  if (mcg) doseMg = mcg.value / 1000;
  return { vialMg, waterMl: ml?.value, doseMg, doseLabel: mcg ? `${mcg.value} mcg` : doseMg != null ? `${doseMg} mg` : undefined };
}

function reconReply(text: string): Reply {
  const { vialMg, waterMl, doseMg, doseLabel } = parseRecon(text);
  if (vialMg && waterMl && doseMg && doseLabel) {
    const r = drawUnits(doseMg, vialMg, waterMl);
    if (r) {
      const warning = r.units > 100 ? 'That is more than a 1 mL syringe holds — use less water in the vial or split the dose.' : r.units < 5 ? 'Under 5 units is hard to measure accurately — reconstituting with less water gives a longer, easier draw.' : undefined;
      return {
        statuses: ['Thinking', 'Doing the math…'],
        text: `${vialMg} mg in ${waterMl} mL of bacteriostatic water gives ${Number(r.mgPerMl.toFixed(3))} mg/mL. A ${doseLabel} dose is ${r.ml.toFixed(2)} mL — **${Number(r.units.toFixed(1))} units** on a U-100 insulin syringe.`,
        cards: [{ kind: 'recon', doseLabel, vialMg, waterMl, mgPerMl: r.mgPerMl, ml: r.ml, units: r.units, warning }],
        actions: [ACT.calculator],
        disclaimer: 'Arithmetic only — confirm every number with your prescriber or pharmacist.',
      };
    }
  }
  const missing = [!vialMg && 'the amount in the vial (mg)', !waterMl && 'how much bacteriostatic water you add (mL)', !doseMg && 'the dose you want (mcg or mg)'].filter(Boolean) as string[];
  return {
    statuses: ['Thinking'],
    text: `Reconstitution is three numbers: what's in the vial, how much water you add, and the dose you want. Concentration = vial ÷ water; volume = dose ÷ concentration; on a U-100 syringe, 1 unit is 0.01 mL.\n\nTell me ${missing.join(', ')} — for example "5 mg vial, 2 mL water, 250 mcg dose" — or use the calculator, which draws the syringe for you.`,
    actions: [ACT.calculator],
  };
}

// ---- insights ---------------------------------------------------------------------------------

function insightsReply(ctx: Context, text: string): Reply {
  const { schedule, health, onboarding, now } = ctx;
  const units = onboarding.units;
  const rows: { label: string; value: string; tone?: 'good' | 'warn' | 'muted' }[] = [];
  const parts: string[] = [];

  // Adherence over the last 14 days.
  const since = new Date(now.getTime() - 14 * 86_400_000);
  const past = schedule.doses.filter((d) => {
    const day = new Date(`${d.day}T12:00:00`);
    return day >= since && day <= now;
  });
  const taken = past.filter((d) => d.logged).length;
  const skipped = past.filter((d) => d.log?.skipped).length;
  const missed = past.filter((d) => !d.log && new Date(`${d.day}T${d.timeKey}:00`) < now).length;
  if (past.length) {
    const pct = Math.round((taken / Math.max(1, past.length)) * 100);
    rows.push({ label: 'Adherence · 14 days', value: `${pct}% · ${taken} of ${past.length}`, tone: pct >= 90 ? 'good' : pct >= 70 ? undefined : 'warn' });
    if (skipped) rows.push({ label: 'Skipped', value: String(skipped), tone: 'muted' });
    if (missed) rows.push({ label: 'Missed (not logged)', value: String(missed), tone: 'warn' });
    parts.push(pct >= 90 ? `Adherence is strong — ${taken} of ${past.length} scheduled doses taken in the last two weeks.` : missed ? `${missed} scheduled dose${missed === 1 ? '' : 's'} in the last two weeks ${missed === 1 ? 'was' : 'were'} never logged — if you took them, log them from the calendar so your history stays honest.` : `${taken} of ${past.length} doses taken in the last two weeks.`);
  }
  const streak = currentStreak(schedule, now);
  if (streak) rows.push({ label: 'Streak', value: `${streak} day${streak === 1 ? '' : 's'}`, tone: 'good' });

  // Body metrics: change over the last 30 days.
  const weightUnit = units === 'imperial' ? 'lb' : 'kg';
  const w = health.filter((e) => e.metric === 'weight').sort((a, b) => a.at.localeCompare(b.at));
  if (w.length >= 2) {
    const recent = w.filter((e) => now.getTime() - new Date(e.at).getTime() < 30 * 86_400_000);
    const first = recent[0] ?? w[0];
    const last = w[w.length - 1];
    const delta = toDisplay('weight', last.value, units) - toDisplay('weight', first.value, units);
    const days = Math.max(1, Math.round((new Date(last.at).getTime() - new Date(first.at).getTime()) / 86_400_000));
    rows.push({ label: `Weight · ${days} days`, value: `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${weightUnit} → ${toDisplay('weight', last.value, units).toFixed(1)} ${weightUnit}`, tone: onboarding.goals.includes('weight') ? (delta < 0 ? 'good' : delta > 0 ? 'warn' : undefined) : undefined });
    parts.push(`Weight has moved ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'not at all'}${delta ? ` ${Math.abs(delta).toFixed(1)} ${weightUnit}` : ''} over ${days} day${days === 1 ? '' : 's'} (${w.length} weigh-ins logged).`);
  } else if (w.length === 1) {
    rows.push({ label: 'Weight', value: `${toDisplay('weight', w[0].value, units).toFixed(1)} ${weightUnit} · one entry`, tone: 'muted' });
    parts.push('One weigh-in so far — a second gives us a trend.');
  }
  for (const metric of ['bodyFat', 'waist'] as const) {
    const e = latest(health, metric);
    if (e) rows.push({ label: metric === 'bodyFat' ? 'Body fat' : 'Waist', value: metric === 'bodyFat' ? `${e.value.toFixed(1)} %` : `${toDisplay('waist', e.value, units).toFixed(1)} ${units === 'imperial' ? 'in' : 'cm'}`, tone: 'muted' });
  }
  const mood = health.filter((e) => e.metric === 'mood' && now.getTime() - new Date(e.at).getTime() < 7 * 86_400_000);
  if (mood.length) rows.push({ label: 'Mood · 7 days', value: `${(mood.reduce((s, e) => s + e.value, 0) / mood.length).toFixed(1)} / 5`, tone: 'muted' });

  // Levels and next dose.
  const summaries = compoundSummaries(schedule, now);
  for (const s of summaries.slice(0, 3)) {
    if (s.levelMg != null) rows.push({ label: `${s.title} · est. level`, value: s.levelMg > 0 ? `~${formatMg(s.levelMg)}` : '0', tone: 'muted' });
  }
  const next = summaries.find((s) => s.nextDue);
  if (next?.nextDue) rows.push({ label: 'Next dose', value: `${next.title} · ${formatRelative(next.nextDue, now)}`, tone: next.overdue ? 'warn' : undefined });

  // Sites.
  const sites = siteHistory(schedule).filter((h) => now.getTime() - new Date(h.at).getTime() < 7 * 86_400_000);
  if (sites.length) {
    const distinct = new Set(sites.map((h) => h.site)).size;
    rows.push({ label: 'Injection sites · 7 days', value: `${distinct} site${distinct === 1 ? '' : 's'} across ${sites.length} shot${sites.length === 1 ? '' : 's'}`, tone: distinct >= Math.min(3, sites.length) ? 'good' : 'warn' });
    if (distinct < Math.min(3, sites.length)) parts.push('Your recent injections went into the same spot — rotating sites keeps absorption even and the tissue healthy. Ask me "where should I inject next?"');
  }

  if (!rows.length) {
    return {
      statuses: ['Thinking', 'Reading your data…'],
      text: `There's nothing to analyse yet. Once you log a few doses and a weigh-in or two, I can show adherence, weight trend, estimated levels and how well you are rotating sites.`,
      actions: [ACT.newProtocol(), ACT.health('weight')],
    };
  }
  const wantsWeight = has(text, /weight|lbs?|kg|scale/);
  const weightPart = parts.find((p) => p.startsWith('Weight') || p.startsWith('One weigh-in'));
  const ordered = wantsWeight && weightPart ? [weightPart, ...parts.filter((p) => p !== weightPart)] : parts;
  return {
    statuses: ['Thinking', 'Reading your data…'],
    text: ordered.join(' ') || `Here's where things stand.`,
    cards: [{ kind: 'insight', title: 'Your last 14 days', rows }],
    actions: [ACT.history, ACT.health('weight')],
  };
}

// ---- stack, doses, sites ----------------------------------------------------------------------

function stackReply(ctx: Context): Reply {
  const { schedule, now } = ctx;
  if (!schedule.protocols.length) {
    return { statuses: ['Thinking'], text: `You aren't tracking anything yet. Create a protocol and I'll keep the schedule, the math and the history for you.`, actions: [ACT.newProtocol()] };
  }
  const summaries = compoundSummaries(schedule, now);
  const protocols = schedule.protocols.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    lines: [
      ...p.items.map((i) => `${i.compoundIds.map((id) => compoundById(id)?.name ?? id).join(' + ')} · ${formatDose(i)} · ${i.administration}`),
      `${describeFrequency(p.frequency)} at ${formatTime(p.time)}${p.cycle ? ` · ${p.cycle.onWeeks} wk on / ${p.cycle.offWeeks} wk off` : ''}`,
    ],
  }));
  const next = summaries.find((s) => s.nextDue);
  const compounds = schedule.protocols.flatMap((p) => p.items.flatMap((i) => i.compoundIds.map((id) => compoundById(id)?.name ?? id)));
  const halfNotes = schedule.protocols
    .flatMap((p) => p.items)
    .map((i) => compoundById(i.compoundIds[0]))
    .filter((c): c is Compound => !!c && !!halfLifeHours(c))
    .map((c) => `${c.name} has a ${describeHalfLife(halfLifeHours(c)!)} half-life`);
  return {
    statuses: ['Thinking', 'Reading your protocols…'],
    text: `You're running ${compounds.length} compound${compounds.length === 1 ? '' : 's'} across ${schedule.protocols.length} protocol${schedule.protocols.length === 1 ? '' : 's'}.${next?.nextDue ? ` Next up: ${next.title} ${formatRelative(next.nextDue, now)}${next.overdue ? ' — overdue' : ''}.` : ''}${halfNotes.length ? ` ${halfNotes.join('; ')}, which is what the Level tile on Home is based on.` : ''}`,
    cards: [{ kind: 'stack', protocols }],
    actions: [ACT.home, ACT.newProtocol()],
  };
}

function describeHalfLife(hours: number): string {
  return hours >= 48 ? `${Number((hours / 24).toFixed(hours % 24 ? 1 : 0))}-day` : `${Number(hours.toFixed(1))}-hour`;
}

function logDoseReply(ctx: Context): Reply {
  const open = openDosesToday(ctx.schedule, ctx.now);
  const all = dosesOn(ctx.schedule, ctx.now);
  if (!ctx.schedule.protocols.length) return { statuses: ['Thinking'], text: `Nothing to log yet — doses come from a protocol. Create one and today's doses appear on Home with a Log button.`, actions: [ACT.newProtocol()] };
  if (!all.length) return { statuses: ['Thinking'], text: `No doses are scheduled today — it's a rest day on your current schedule. If you took something extra, add it from the calendar.`, actions: [ACT.home, ACT.history] };
  if (!open.length) return { statuses: ['Thinking'], text: `Everything due today is already handled — ${all.length} dose${all.length === 1 ? '' : 's'}. Tap one to edit it.`, cards: [{ kind: 'doses', doses: all.map((d) => ({ id: d.id, title: d.title, amount: d.amount, time: d.time, logged: !!d.log })) }], actions: [ACT.history] };
  return {
    statuses: ['Thinking', "Reading today's schedule…"],
    text: `${open.length === 1 ? 'One dose is' : `${open.length} doses are`} still open today. Tap to log it — you can set the site and the exact time on the next screen.`,
    cards: [{ kind: 'doses', doses: open.map((d) => ({ id: d.id, title: d.title, amount: d.amount, time: d.time, logged: false })) }],
  };
}

function siteReply(ctx: Context): Reply {
  const { schedule, now } = ctx;
  const injections = schedule.protocols.flatMap((p) => p.items).filter((i) => kindFor(i.administration));
  if (!injections.length) return { statuses: ['Thinking'], text: `None of your protocols are injections, so there's no site to rotate. If you add an injectable, I'll suggest sites as you log.`, actions: [ACT.newProtocol()] };
  const kind = kindFor(injections[0].administration) ?? 'sc';
  const history = siteHistory(schedule).filter((h) => h.administration === injections[0].administration);
  const s = suggestSite(history, kind, now);
  const last = history[0];
  const lastSite = last ? siteById(last.site) : null;
  const recent = new Set(history.filter((h) => now.getTime() - new Date(h.at).getTime() < 7 * 86_400_000).map((h) => h.site));
  const rows = [
    { label: 'Suggested', value: s.site.label, tone: 'good' as const },
    ...(lastSite && last ? [{ label: 'Last', value: `${lastSite.label} · ${formatRelative(new Date(last.at), now)}` }] : []),
    { label: 'Sites used this week', value: String(recent.size), tone: 'muted' as const },
  ];
  return {
    statuses: ['Thinking', 'Checking your site rotation…'],
    text: `${s.site.label}. ${s.reason}\n\nWhen you log the dose, the site picker will have it pre-suggested — tap ✦ Suggest.`,
    cards: [{ kind: 'insight', title: 'Rotation', rows }],
    actions: [ACT.logDose],
  };
}

// ---- navigation help --------------------------------------------------------------------------

function helpReply(text: string): Reply | null {
  const t = norm(text);
  const q = (re: RegExp) => re.test(t);
  if (q(/log (a |my )?dose|record (a )?dose|mark .*(taken|done)/)) return { statuses: ['Thinking'], text: `Two ways: tap a dose row on Home (or its "Log" button), or press + and choose Log dose. You'll confirm the amount, pick the injection site on the body map and set the time — Suggest picks the next site in your rotation.`, actions: [ACT.logDose] };
  if (q(/units?|metric|imperial|kg|lbs?|pounds|kilo/)) return { statuses: ['Thinking'], text: `Units live in Settings → Units. Switching changes every weight, height and waist reading in the app; your data is stored metric underneath so nothing is lost.`, actions: [ACT.settings] };
  if (q(/remind|notif|alert/)) return { statuses: ['Thinking'], text: `Reminders follow each protocol's reminder time. Turn them on or off per topic in Settings → Notifications; the system permission has to be granted there too.`, actions: [ACT.notifications] };
  if (q(/delete (my )?account|remove (my )?data|erase/)) return { statuses: ['Thinking'], text: `Settings → Delete account removes your account and profile from our servers immediately, then forgets this device. It can't be undone.`, actions: [ACT.settings] };
  if (q(/site|where .*inject|rotate|rotation/)) return { statuses: ['Thinking'], text: `The injection site is part of logging a dose: open the dose, tap SITE, and pick a point on the body map — ✦ Suggest picks the next spot in your rotation and says why. Home shows your last site and this week's sites on the Application site card.`, actions: [ACT.logDose] };
  if (q(/calculat|reconstitut|units to draw|how many units/)) return { statuses: ['Thinking'], text: `Press + and choose Open calculator. Enter what's in the vial, the water you add and the dose you want; it draws the syringe and tells you the units. Or just tell me the three numbers here.`, actions: [ACT.calculator] };
  if (q(/protocol|schedule|compound|peptide|track/)) return { statuses: ['Thinking'], text: `Press + and choose Create protocol (or tap the button on Home). Pick one or more compounds, choose separate vials or a blend, set dose, frequency, reminder time and start date — the doses land on your calendar right away.`, actions: [ACT.newProtocol()] };
  if (q(/weight|health|mood|energy|waist|body fat/)) return { statuses: ['Thinking'], text: `Press + → Log health, then pick the metric. Weight, body fat, lean mass and waist take a number in your units; mood and energy are a 1–5 scale. Ask me "how am I doing?" any time for the trend.`, actions: [ACT.health('weight')] };
  if (q(/calendar|month|other day|past|history/)) return { statuses: ['Thinking'], text: `Tap the calendar icon in the Home header to open the calendar — the week strip pulls down into a full month. Picking a day shows that day's doses so you can log or fix them. Dose history lists everything you've taken or skipped.`, actions: [ACT.home, ACT.history] };
  return null;
}

// ---- entry point ------------------------------------------------------------------------------

export function respond(input: string, ctx: Context): Reply {
  const text = input.trim();
  const t = norm(text);
  const name = ctx.onboarding.name?.trim().split(/\s+/)[0];
  const compounds = mentionedCompounds(text);

  if (has(t, /^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))\b/) && t.split(' ').length <= 4) {
    return {
      statuses: ['Thinking'],
      text: `Hi${name ? ` ${name}` : ''}. I can look up any compound in the library with sources, do reconstitution math, suggest your next injection site, read your adherence and weight trend, and take you straight to logging or building a protocol. What would you like to do?`,
    };
  }
  if (has(t, /food|meal|macro|calorie|kcal|protein|carb|nutrition|scan|\beat\b|diet/)) {
    return {
      statuses: ['Thinking'],
      text: `Food logging and meal photos aren't in this build yet — I'd rather say so than pretend. Your daily calorie and macro targets are estimated from your onboarding answers under Settings → Daily goals, and I'll let you know when logging lands.`,
      actions: [ACT.goals],
    };
  }
  const unitNumbers = (t.match(/\d+(\.\d+)?\s*(mg|mcg|ug|ml|iu)\b/g) ?? []).length;
  if (unitNumbers >= 2 || has(t, /reconstitut|bac water|bacteriostatic|how many units|units? (to |do i )?draw|mix(ing)? (a |my |the )?vial|dilut|concentration/)) {
    if (compounds.length && unitNumbers < 2) {
      const r = researchReply(compounds, text, ctx);
      r.text += `\n\nFor the mixing math, give me the vial size, the water you add and the dose — or open the calculator.`;
      return r;
    }
    return reconReply(text);
  }
  if (has(t, /where (should|do) i inject|next (injection )?site|which site|inject next|rotate|rotation/)) return siteReply(ctx);
  if (has(t, /^(where|how) (do|can|should) i\b/) && !compounds.length) {
    const help = helpReply(text);
    if (help) return help;
  }
  if (has(t, /^log (a |my )?dose|log (a |my )?dose$|i (just )?took|took my|mark .*(taken|done)|record (a |my )?dose/)) return logDoseReply(ctx);
  if (has(t, /(show|what.?s|whats) (me )?my (current )?(stack|protocols?|schedule|compounds|peptides)|what am i (taking|running|on)|my stack|my protocols?/)) return stackReply(ctx);
  if (has(t, /how am i doing|insight|progress|trend|adheren|streak|consisten|how (has|have) my|changed|analy[sz]e|my (recent )?data|my level|missed/)) return insightsReply(ctx, text);
  if (has(t, /^(add|create|new|set ?up|start) .*(protocol|schedule|compound|peptide|tracker|tracking)/)) {
    return {
      statuses: ['Thinking'],
      text: `Let's set it up. Pick one or more compounds — anything in the library, a curated stack, or a custom one — then dose, frequency, reminder time and start date. The doses land on your calendar right away.`,
      actions: [ACT.newProtocol(compounds[0]?.id)],
    };
  }
  if (has(t, /^log (my )?(weight|body ?fat|lean|waist|mood|energy)/)) {
    const metric = /body ?fat/.test(t) ? 'bodyFat' : /lean/.test(t) ? 'leanMass' : /waist/.test(t) ? 'waist' : /mood/.test(t) ? 'mood' : /energy/.test(t) ? 'energy' : 'weight';
    return { statuses: ['Thinking'], text: `Opening the ${metric === 'bodyFat' ? 'body fat' : metric === 'leanMass' ? 'lean mass' : metric} entry — I'll keep the trend for you.`, actions: [ACT.health(metric)] };
  }
  if (has(t, /research|study|studies|evidence|science|trial/) && !compounds.length) {
    const mine = ctx.schedule.protocols.flatMap((p) => p.items.flatMap((i) => i.compoundIds)).map((id) => compoundById(id)).filter((c): c is Compound => !!c);
    if (mine.length) return { ...researchReply(mine.slice(0, 3), text, ctx), text: `Here's the research picture for what you're tracking:` };
    return { statuses: ['Thinking', 'Checking the research library…'], text: `Name a compound and I'll pull what the library has, with links to PubMed, ClinicalTrials.gov and PMC. Popular ones: retatrutide, tirzepatide, semaglutide, BPC-157, TB-500, CJC-1295/ipamorelin.`, actions: [ACT.library()] };
  }
  if (compounds.length) return researchReply(compounds, text, ctx);
  const help = helpReply(text);
  if (help) return help;

  return {
    statuses: ['Thinking'],
    text: `I'm not sure what you mean yet. I'm grounded in your data and the library rather than a general model, so I'm best at: a compound by name (“tell me about BPC-157”), reconstitution math (“5 mg vial, 2 mL water, 250 mcg dose”), your next injection site, your adherence and weight trend, your current stack, or getting you to the right screen (“where do I log a dose?”).`,
  };
}

/** Skill chips can be contextual: research on what the user actually runs. */
export function skillPrompt(id: string, ctx: Context): string | null {
  if (id === 'research') {
    const first = ctx.schedule.protocols[0]?.items[0]?.compoundIds[0];
    const c = first ? compoundById(first) : undefined;
    return c ? `What does the research say about ${c.name}?` : null;
  }
  return null;
}
