import { compoundById, halfLifeHours, type Compound } from './compounds';
import { toMg, type Protocol, type Schedule } from './schedule';

/**
 * Estimated amount of a compound in the body over time — a one-compartment model with
 * first-order absorption (the Bateman function), summed over every dose. It is only offered for
 * compounds whose elimination half-life is documented (see `HALF_LIFE_HOURS`); absorption speed
 * comes from the published time-to-peak for the route. An estimate, never a measurement.
 */

/**
 * Absorption half-lives (hours), chosen so the modelled time-to-peak matches the published tmax.
 * Depot esters in oil (testosterone, nandrolone) are absorption-limited, so they get a long one.
 */
const ABSORPTION_HALF_LIFE_HOURS: Record<string, number> = {
  semaglutide: 20, // tmax 1–3 days
  tirzepatide: 10, // tmax 8–72 h
  retatrutide: 12,
  liraglutide: 4, // tmax 8–12 h
  dulaglutide: 14, // tmax 24–72 h
  exenatide: 0.7, // tmax ~2 h
  cagrilintide: 12,
  'cjc-1295-dac': 1,
  ipamorelin: 0.3,
  'mk-677': 0.4, // oral, tmax ~1 h
  somatropin: 2, // tmax 4–6 h subcutaneous
  'pt-141': 0.4, // tmax ~1 h
  hcg: 6, // tmax 12–24 h
  'testosterone-cypionate': 24,
  'testosterone-enanthate': 24,
  'testosterone-propionate': 8,
  'testosterone-undecanoate-inj': 72,
  'nandrolone-decanoate': 24,
  npp: 12,
  anastrozole: 0.7, // oral, tmax ~2 h
  metformin: 1, // oral, tmax ~2.5 h
};

export type PkProfile = { compound: Compound; halfLifeHours: number; absorptionHalfLifeHours: number };

/** The model parameters for a compound, or null when its half-life is not documented. */
export function pkProfile(compoundId: string): PkProfile | null {
  const compound = compoundById(compoundId);
  if (!compound) return null;
  const half = halfLifeHours(compound);
  if (!half) return null;
  const key = compound.peptideId ?? compound.id;
  return { compound, halfLifeHours: half, absorptionHalfLifeHours: ABSORPTION_HALF_LIFE_HOURS[key] ?? ABSORPTION_HALF_LIFE_HOURS[compound.id] ?? 0.5 };
}

const LN2 = Math.LN2;

/** Fraction of a dose in the body `hours` after taking it (0 before it is taken). */
export function fractionInBody(hours: number, profile: Pick<PkProfile, 'halfLifeHours' | 'absorptionHalfLifeHours'>): number {
  if (hours <= 0) return 0;
  const ke = LN2 / profile.halfLifeHours;
  const ka = LN2 / profile.absorptionHalfLifeHours;
  if (Math.abs(ka - ke) < 1e-9) return ka * hours * Math.exp(-ka * hours);
  return (ka / (ka - ke)) * (Math.exp(-ke * hours) - Math.exp(-ka * hours));
}

export type DoseEventMg = { at: number; mg: number; projected: boolean };

/** Every dose of a compound that feeds the curve: taken logs (actual amounts) plus, after `now`, the open scheduled ones. */
export function doseEvents(schedule: Schedule, compoundId: string, now: Date): DoseEventMg[] {
  const out: DoseEventMg[] = [];
  const protocolById = new Map<string, Protocol>(schedule.protocols.map((p) => [p.id, p]));
  for (const d of schedule.doses) {
    const protocol = protocolById.get(d.protocolId);
    const item = protocol?.items.find((i) => i.id === d.itemId);
    if (!item || item.compoundIds.length !== 1 || item.compoundIds[0] !== compoundId) continue;
    if (d.log) {
      if (d.log.skipped) continue;
      const mg = toMg(d.log.dose ?? item.dose ?? 0, d.log.unit ?? item.unit);
      if (mg) out.push({ at: new Date(d.log.at).getTime(), mg, projected: false });
    } else {
      const due = new Date(`${d.day}T${d.timeKey}:00`).getTime();
      if (due < now.getTime()) continue; // missed and unlogged: assume not taken
      const mg = toMg(item.dose ?? 0, item.unit);
      if (mg) out.push({ at: due, mg, projected: true });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Amount in the body at one instant, in mg. */
export function levelAt(t: number, events: DoseEventMg[], profile: PkProfile): number {
  let total = 0;
  for (const e of events) {
    if (e.at > t) break;
    total += e.mg * fractionInBody((t - e.at) / 3_600_000, profile);
  }
  return total;
}

export type RangeId = '4H' | '1D' | '7D' | '30D' | '90D' | 'ALL';
export const RANGES: { id: RangeId; label: string }[] = [
  { id: '4H', label: '4H' },
  { id: '1D', label: '1D' },
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
  { id: '90D', label: '90D' },
  { id: 'ALL', label: 'All' },
];

const H = 3_600_000;
const D = 24 * H;

/** The time window a range shows, placed so "now" sits about two-thirds across. */
export function rangeWindow(range: RangeId, now: number, events: DoseEventMg[]): { start: number; end: number } {
  switch (range) {
    case '4H':
      return { start: now - 2 * H, end: now + 2 * H };
    case '1D':
      return { start: now - 14 * H, end: now + 10 * H };
    case '7D':
      return { start: now - 5 * D, end: now + 2 * D };
    case '30D':
      return { start: now - 23 * D, end: now + 7 * D };
    case '90D':
      return { start: now - 75 * D, end: now + 15 * D };
    case 'ALL': {
      const first = events.find((e) => !e.projected)?.at ?? now - D;
      const start = Math.min(first - D, now - 6 * D);
      return { start, end: now + Math.max(21 * D, (now - start) * 0.6) };
    }
  }
}

export type Series = {
  points: { t: number; mg: number }[];
  /** Index of the first point at or after now. */
  nowIndex: number;
  maxMg: number;
  /** When the curve peaks within the window, if that peak is still ahead. */
  peakAhead: { t: number; mg: number } | null;
};

/** Samples the curve across a window; points after now come from the scheduled doses. */
export function series(events: DoseEventMg[], profile: PkProfile, start: number, end: number, now: number, count = 180): Series {
  const points: { t: number; mg: number }[] = [];
  const step = (end - start) / (count - 1);
  let maxMg = 0;
  let nowIndex = -1;
  let peakAhead: { t: number; mg: number } | null = null;
  for (let i = 0; i < count; i++) {
    const t = start + step * i;
    const mg = levelAt(t, events, profile);
    points.push({ t, mg });
    if (mg > maxMg) maxMg = mg;
    if (nowIndex === -1 && t >= now) nowIndex = i;
    if (t >= now && (!peakAhead || mg > peakAhead.mg)) peakAhead = { t, mg };
  }
  if (nowIndex === -1) nowIndex = count - 1;
  const nowMg = levelAt(now, events, profile);
  if (peakAhead && peakAhead.mg <= nowMg * 1.001) peakAhead = null;
  return { points, nowIndex, maxMg, peakAhead };
}

/** "Peaks in 3 h" / "Falling · 6-day half-life" — the Level tile's caption. */
export function describeTrend(schedule: Schedule, compoundId: string, now: Date): string | null {
  const profile = pkProfile(compoundId);
  if (!profile) return null;
  const events = doseEvents(schedule, compoundId, now);
  if (!events.some((e) => !e.projected)) return null;
  const t = now.getTime();
  const horizon = Math.min(3 * D, profile.absorptionHalfLifeHours * 8 * H);
  const s = series(events.filter((e) => !e.projected), profile, t, t + horizon, t, 120);
  if (s.peakAhead) {
    const hours = (s.peakAhead.t - t) / H;
    return `Peaks ${hours < 1 ? `in ${Math.max(1, Math.round(hours * 60))} min` : hours < 48 ? `in ${Math.round(hours)} h` : `in ${Math.round(hours / 24)} days`}`;
  }
  return `Falling · ${profile.halfLifeHours >= 48 ? `${Number((profile.halfLifeHours / 24).toFixed(profile.halfLifeHours % 24 ? 1 : 0))}-day` : `${Number(profile.halfLifeHours.toFixed(1))}-hour`} half-life`;
}
