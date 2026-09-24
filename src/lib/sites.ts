import type { Administration } from './schedule';

/**
 * Injection sites people actually rotate through, several per region so a rotation can move
 * around inside the abdomen or a thigh, not just between them. Subcutaneous shots go where there
 * is a pinchable fat layer (abdomen, thighs, upper arms, flanks, upper buttock); intramuscular
 * ones into muscle (deltoid, vastus lateralis on the outer thigh, ventrogluteal hip, upper-outer
 * glute).
 */
export type SiteId =
  | 'abdomen-upper-l' | 'abdomen-upper-r'
  | 'abdomen-l' | 'abdomen-r'
  | 'abdomen-lower-l' | 'abdomen-lower-r'
  | 'flank-l' | 'flank-r'
  | 'thigh-l' | 'thigh-r'
  | 'thigh-outer-l' | 'thigh-outer-r'
  | 'delt-l' | 'delt-r'
  | 'delt-rear-l' | 'delt-rear-r'
  | 'thigh-back-l' | 'thigh-back-r'
  | 'arm-outer-l' | 'arm-outer-r'
  | 'arm-l' | 'arm-r'
  | 'hip-l' | 'hip-r'
  | 'glute-l' | 'glute-r'
  | 'glute-upper-l' | 'glute-upper-r';

export type SiteView = 'front' | 'back';
export type Kind = 'sc' | 'im';
export type Region = 'abdomen' | 'flank' | 'thigh' | 'shoulder' | 'arm' | 'hip' | 'glute';

export type Site = {
  id: SiteId;
  /** Full name, e.g. "Left upper abdomen". */
  label: string;
  /** Compact form for rows and toasts, e.g. "L. Upper abd". */
  short: string;
  view: SiteView;
  region: Region;
  /** Which injection kinds this site is appropriate for. */
  kinds: Kind[];
  /** Rotation partner across the midline. */
  mirror: SiteId;
};

const pair = (base: string, label: string, short: string, view: SiteView, region: Region, kinds: Kind[]): Site[] => [
  { id: `${base}-l` as SiteId, label: `Left ${label}`, short: `L. ${short}`, view, region, kinds, mirror: `${base}-r` as SiteId },
  { id: `${base}-r` as SiteId, label: `Right ${label}`, short: `R. ${short}`, view, region, kinds, mirror: `${base}-l` as SiteId },
];

// "Left" is the person's left: on the viewer's RIGHT in the front view and the viewer's LEFT in the back view.
export const SITES: Site[] = [
  ...pair('abdomen-upper', 'upper abdomen', 'Upper abd', 'front', 'abdomen', ['sc']),
  ...pair('abdomen', 'abdomen', 'Abd', 'front', 'abdomen', ['sc']),
  ...pair('abdomen-lower', 'lower abdomen', 'Lower abd', 'front', 'abdomen', ['sc']),
  ...pair('flank', 'flank', 'Flank', 'front', 'flank', ['sc']),
  ...pair('thigh', 'front thigh', 'Thigh', 'front', 'thigh', ['sc']),
  ...pair('thigh-outer', 'outer thigh', 'Outer thigh', 'front', 'thigh', ['sc', 'im']),
  ...pair('delt', 'deltoid', 'Delt', 'front', 'shoulder', ['im']),
  ...pair('arm-outer', 'outer arm', 'Outer arm', 'front', 'arm', ['sc']),
  ...pair('delt-rear', 'rear deltoid', 'Rear delt', 'back', 'shoulder', ['im']),
  ...pair('arm', 'back of arm', 'Back arm', 'back', 'arm', ['sc']),
  ...pair('thigh-back', 'back of thigh', 'Back thigh', 'back', 'thigh', ['sc']),
  ...pair('hip', 'hip', 'Hip', 'back', 'hip', ['im']),
  ...pair('glute', 'upper-outer glute', 'Glute', 'back', 'glute', ['sc', 'im']),
  ...pair('glute-upper', 'upper glute', 'Upper glute', 'back', 'glute', ['sc']),
];

export const siteById = (id: string) => SITES.find((s) => s.id === id);

/** Which body illustration is drawn — chosen from the sex given in onboarding. */
export type Figure = 'male' | 'female';

/** A marker centre, as fractions of the illustration box (100 wide × 220 tall). */
export type Point = { x: number; y: number };

/**
 * Where each site sits on each figure. Read off the artwork in `assets/body/*.png`; re-measure
 * if the art changes. Viewer-left / viewer-right pairs are given as [person-left, person-right].
 */
export const POINTS: Record<Figure, Record<SiteId, Point>> = {
  male: {
    'delt-r': { x: 0.27, y: 0.255 }, 'delt-l': { x: 0.73, y: 0.255 },
    'arm-outer-r': { x: 0.195, y: 0.345 }, 'arm-outer-l': { x: 0.805, y: 0.345 },
    'abdomen-upper-r': { x: 0.425, y: 0.362 }, 'abdomen-upper-l': { x: 0.575, y: 0.362 },
    'abdomen-r': { x: 0.405, y: 0.416 }, 'abdomen-l': { x: 0.595, y: 0.416 },
    'abdomen-lower-r': { x: 0.44, y: 0.468 }, 'abdomen-lower-l': { x: 0.56, y: 0.468 },
    'flank-r': { x: 0.325, y: 0.452 }, 'flank-l': { x: 0.675, y: 0.452 },
    'thigh-outer-r': { x: 0.325, y: 0.56 }, 'thigh-outer-l': { x: 0.675, y: 0.56 },
    'thigh-r': { x: 0.395, y: 0.645 }, 'thigh-l': { x: 0.605, y: 0.645 },
    'delt-rear-l': { x: 0.27, y: 0.262 }, 'delt-rear-r': { x: 0.73, y: 0.262 },
    'arm-l': { x: 0.215, y: 0.358 }, 'arm-r': { x: 0.785, y: 0.358 },
    'hip-l': { x: 0.305, y: 0.475 }, 'hip-r': { x: 0.695, y: 0.475 },
    'glute-upper-l': { x: 0.43, y: 0.49 }, 'glute-upper-r': { x: 0.57, y: 0.49 },
    'glute-l': { x: 0.355, y: 0.535 }, 'glute-r': { x: 0.645, y: 0.535 },
    'thigh-back-l': { x: 0.39, y: 0.66 }, 'thigh-back-r': { x: 0.61, y: 0.66 },
  },
  female: {
    'delt-r': { x: 0.3, y: 0.225 }, 'delt-l': { x: 0.7, y: 0.225 },
    'arm-outer-r': { x: 0.245, y: 0.31 }, 'arm-outer-l': { x: 0.755, y: 0.31 },
    'abdomen-upper-r': { x: 0.43, y: 0.33 }, 'abdomen-upper-l': { x: 0.57, y: 0.33 },
    'abdomen-r': { x: 0.41, y: 0.38 }, 'abdomen-l': { x: 0.59, y: 0.38 },
    'abdomen-lower-r': { x: 0.45, y: 0.428 }, 'abdomen-lower-l': { x: 0.55, y: 0.428 },
    'flank-r': { x: 0.345, y: 0.418 }, 'flank-l': { x: 0.655, y: 0.418 },
    'thigh-outer-r': { x: 0.315, y: 0.54 }, 'thigh-outer-l': { x: 0.685, y: 0.54 },
    'thigh-r': { x: 0.39, y: 0.635 }, 'thigh-l': { x: 0.61, y: 0.635 },
    'delt-rear-l': { x: 0.3, y: 0.232 }, 'delt-rear-r': { x: 0.7, y: 0.232 },
    'arm-l': { x: 0.245, y: 0.322 }, 'arm-r': { x: 0.755, y: 0.322 },
    'hip-l': { x: 0.325, y: 0.432 }, 'hip-r': { x: 0.675, y: 0.432 },
    'glute-upper-l': { x: 0.44, y: 0.45 }, 'glute-upper-r': { x: 0.56, y: 0.45 },
    'glute-l': { x: 0.375, y: 0.49 }, 'glute-r': { x: 0.625, y: 0.49 },
    'thigh-back-l': { x: 0.385, y: 0.655 }, 'thigh-back-r': { x: 0.615, y: 0.655 },
  },
};

export const pointFor = (id: SiteId, figure: Figure): Point => POINTS[figure][id];

/** Pens and reconstituted vials are subcutaneous unless the protocol says intramuscular. */
export function kindFor(administration: Administration, intramuscular = false): Kind | null {
  if (administration === 'oral' || administration === 'nasal' || administration === 'topical') return null;
  return intramuscular ? 'im' : 'sc';
}

/** Preferred rotation order: the sites with the most consistent absorption first, alternating sides. */
const ROTATION: Record<Kind, SiteId[]> = {
  sc: [
    'abdomen-l', 'abdomen-r', 'abdomen-upper-l', 'abdomen-upper-r', 'abdomen-lower-l', 'abdomen-lower-r',
    'thigh-l', 'thigh-r', 'thigh-outer-l', 'thigh-outer-r',
    'arm-l', 'arm-r', 'arm-outer-l', 'arm-outer-r',
    'flank-l', 'flank-r',
    'glute-l', 'glute-r', 'glute-upper-l', 'glute-upper-r',
    'thigh-back-l', 'thigh-back-r',
  ],
  im: ['hip-l', 'hip-r', 'glute-l', 'glute-r', 'thigh-outer-l', 'thigh-outer-r', 'delt-l', 'delt-r', 'delt-rear-l', 'delt-rear-r'],
};

const DAY_MS = 86_400_000;

export type Suggestion = { site: Site; reason: string };

/** Days since a site was last used, or null if never. */
export function daysSince(history: { site: string; at: string }[], id: SiteId, now = new Date()): number | null {
  const hit = history.find((h) => h.site === id);
  return hit ? Math.floor((now.getTime() - new Date(hit.at).getTime()) / DAY_MS) : null;
}

/**
 * Picks the next site from the history of taken doses. Rules, in order: never the exact spot
 * used last; skip anything used in the past week when an alternative exists; among the rest,
 * the least recently used, in an order that favours consistent absorption. Explains itself.
 */
export function suggestSite(history: { site: string; at: string }[], kind: Kind, now = new Date()): Suggestion {
  const order = ROTATION[kind];
  const lastUsed = new Map<string, number>();
  for (const h of history) if (!lastUsed.has(h.site)) lastUsed.set(h.site, new Date(h.at).getTime());
  const relevant = history.filter((h) => order.includes(h.site as SiteId));

  if (relevant.length === 0) {
    const first = siteById(order[0])!;
    return {
      site: first,
      reason:
        kind === 'sc'
          ? 'First injection here. The abdomen absorbs most consistently and is the easiest place to pinch a fold — stay two finger-widths from the navel.'
          : 'First injection here. The ventrogluteal site on the hip is the safest large muscle: thick, well away from the sciatic nerve and major vessels.',
    };
  }

  const last = relevant[0];
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const fresh = order.filter((id) => id !== last.site && (lastUsed.get(id) ?? 0) < weekAgo);
  const candidates = fresh.length ? fresh : order.filter((id) => id !== last.site);
  const pick = [...candidates].sort((a, b) => (lastUsed.get(a) ?? 0) - (lastUsed.get(b) ?? 0))[0] ?? order[0];
  const chosen = siteById(pick)!;
  const lastSite = siteById(last.site);
  const rested = lastUsed.get(pick) ? Math.round((now.getTime() - lastUsed.get(pick)!) / DAY_MS) : null;

  let reason: string;
  if (lastSite && chosen.id === lastSite.mirror) reason = `Last time was the ${lastSite.label.toLowerCase()}, so the opposite side keeps the rotation even.`;
  else if (lastSite && chosen.region === lastSite.region) reason = `Same region as last time but a different spot — a few centimetres apart is enough to let the tissue recover.`;
  else if (rested == null) reason = `You have not used the ${chosen.label.toLowerCase()} yet — fresh tissue absorbs best and spreads the load.`;
  else reason = `The ${chosen.label.toLowerCase()} has rested ${rested} day${rested === 1 ? '' : 's'}, the longest of your ${kind === 'sc' ? 'subcutaneous' : 'muscle'} sites.`;
  if (!fresh.length) reason += ' Every site was used this week — consider adding a new region to the rotation.';
  return { site: chosen, reason };
}
