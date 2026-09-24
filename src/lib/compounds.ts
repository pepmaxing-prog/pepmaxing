import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { CATEGORIES, PEPTIDES, peptideById, type Category, type CategoryId } from './peptides';

/**
 * Everything a protocol can track. The Library documents peptides in depth; this is the wider,
 * lighter list — peptides, blends, GLP-1 brands, hormones, vitamins and a few common drugs —
 * so people can log what they actually run. Entries with `peptideId` link to a Library write-up.
 */
export type CompoundCategoryId = CategoryId | 'vitamins' | 'other';
export type CompoundKind = 'peptide' | 'blend' | 'brand' | 'hormone' | 'vitamin' | 'compound';

export type Compound = {
  id: string;
  name: string;
  /** Alternate name, brand's active ingredient, or a blend's components. */
  aka?: string;
  category: CompoundCategoryId;
  kind: CompoundKind;
  /** Library entry, when we have written one. */
  peptideId?: string;
  /** Curated stack this blend corresponds to. */
  stackId?: string;
  custom?: boolean;
};

export const COMPOUND_CATEGORIES: Category<CompoundCategoryId>[] = [
  ...CATEGORIES,
  { id: 'vitamins', label: 'Vitamins & minerals', color: '#CBD5E1', blurb: 'Micronutrients and injectables' },
  { id: 'other', label: 'Other', color: '#94A3B8', blurb: 'Everything else worth tracking' },
];

export const compoundCategoryById = (id: CompoundCategoryId) => COMPOUND_CATEGORIES.find((c) => c.id === id)!;

const p = (id: string, category?: CompoundCategoryId): Compound => {
  const peptide = peptideById(id)!;
  return { id, name: peptide.name, category: category ?? peptide.category, kind: 'peptide', peptideId: id };
};
const c = (id: string, name: string, category: CompoundCategoryId, kind: CompoundKind, aka?: string, extra?: Partial<Compound>): Compound => ({ id, name, category, kind, aka, ...extra });

/** Shown first under "All", in this order; the rest follow alphabetically. */
export const POPULAR: string[] = ['retatrutide', 'tirzepatide', 'semaglutide', 'bpc-157', 'tb-500', 'cjc-ipamorelin', 'tesamorelin', 'ghk-cu', 'nad-plus', 'mots-c', 'ipamorelin', 'sermorelin', 'glutathione', 'bpc-tb500', 'glow', 'klow', 'melanotan-ii', 'semax', 'selank', 'kpv'];

export const COMPOUNDS: Compound[] = [
  // ---- Library peptides -------------------------------------------------------------------
  ...PEPTIDES.map((x) => p(x.id)),

  // ---- Blends ------------------------------------------------------------------------------
  c('cjc-ipamorelin', 'CJC-1295 / Ipamorelin', 'growth', 'blend', 'CJC-1295 · Ipamorelin', { stackId: 'gh-classic' }),
  c('bpc-tb500', 'BPC-157 / TB-500', 'healing', 'blend', 'BPC-157 · TB-500', { stackId: 'wolverine' }),
  c('glow', 'GLOW', 'healing', 'blend', 'GHK-Cu · BPC-157 · TB-500', { stackId: 'glow' }),
  c('klow', 'KLOW', 'healing', 'blend', 'GHK-Cu · BPC-157 · TB-500 · KPV', { stackId: 'klow' }),
  c('tesamorelin-ipamorelin', 'Tesamorelin / Ipamorelin', 'growth', 'blend', 'Tesamorelin · Ipamorelin'),
  c('sermorelin-ipamorelin', 'Sermorelin / Ipamorelin', 'growth', 'blend', 'Sermorelin · Ipamorelin'),
  c('lipo-c', 'Lipo-C', 'weight', 'blend', 'Lipotropic injection: MIC + B12'),

  // ---- More peptides (no write-up yet) -----------------------------------------------------
  c('igf-1-lr3', 'IGF-1 LR3', 'growth', 'peptide', 'Long-arginine-3 IGF-1'),
  c('igf-1-des', 'IGF-1 DES (1-3)', 'growth', 'peptide'),
  c('cjc-1295-dac', 'CJC-1295 (DAC)', 'growth', 'peptide', 'With drug affinity complex'),
  c('peg-mgf', 'PEG-MGF', 'growth', 'peptide', 'PEGylated mechano growth factor'),
  c('mgf', 'Mechano growth factor', 'growth', 'peptide', 'MGF'),
  c('somatropin', 'Somatropin', 'growth', 'hormone', 'HGH, recombinant growth hormone'),
  c('thymosin-beta-4', 'Thymosin beta-4', 'healing', 'peptide', 'TB4, full length'),
  c('ahk-cu', 'AHK-Cu', 'healing', 'peptide', 'Copper tripeptide for hair'),
  c('b7-33', 'B7-33', 'healing', 'peptide', 'Relaxin analogue'),
  c('melanotan-i', 'Melanotan I', 'hormonal', 'peptide', 'MT-1, afamelanotide'),
  c('hcg', 'HCG', 'hormonal', 'hormone', 'Human chorionic gonadotropin'),
  c('triptorelin', 'Triptorelin', 'hormonal', 'peptide', 'GnRH agonist'),
  c('vasopressin', 'Vasopressin', 'hormonal', 'hormone', 'Antidiuretic hormone'),
  c('trh', 'TRH', 'hormonal', 'hormone', 'Thyrotropin-releasing hormone'),
  c('thymalin', 'Thymalin', 'immune', 'peptide', 'Thymus bioregulator'),
  c('vilon', 'Vilon', 'immune', 'peptide', 'Lys-Glu bioregulator'),
  c('vip', 'VIP', 'immune', 'peptide', 'Vasoactive intestinal peptide'),
  c('pinealon', 'Pinealon', 'cognitive', 'peptide', 'Glu-Asp-Arg bioregulator'),
  c('adamax', 'Adamax', 'cognitive', 'peptide', 'Semax derivative'),
  c('p21', 'P21', 'cognitive', 'peptide', 'CNTF-derived'),
  c('noopept', 'Noopept', 'cognitive', 'compound', 'Omberacetam'),
  c('5-amino-1mq', '5-Amino-1MQ', 'weight', 'compound', 'NNMT inhibitor'),
  c('mazdutide', 'Mazdutide', 'weight', 'peptide', 'GLP-1 / glucagon dual agonist'),
  c('exenatide', 'Exenatide', 'weight', 'peptide', 'Byetta'),
  c('exenatide-er', 'Exenatide extended-release', 'weight', 'peptide', 'Bydureon'),
  c('dulaglutide', 'Dulaglutide', 'weight', 'peptide', 'Trulicity'),
  c('insulin', 'Insulin', 'weight', 'hormone', 'Human insulin'),
  c('salmon-calcitonin', 'Salmon calcitonin', 'other', 'peptide', 'Bone-resorption inhibitor'),
  c('calcitonin', 'Calcitonin', 'other', 'peptide'),

  // ---- Cosmetic peptides -------------------------------------------------------------------
  c('snap-8', 'SNAP-8', 'longevity', 'peptide', 'Acetyl octapeptide-3, topical'),
  c('argireline', 'Argireline', 'longevity', 'peptide', 'Acetyl hexapeptide-8, topical'),
  c('matrixyl-3000', 'Matrixyl 3000', 'longevity', 'peptide', 'Palmitoyl peptides, topical'),
  c('matrixyl-synthe6', "Matrixyl Synthe'6", 'longevity', 'peptide', 'Palmitoyl tripeptide-38, topical'),
  c('leuphasyl', 'Leuphasyl', 'longevity', 'peptide', 'Pentapeptide-18, topical'),
  c('syn-ake', 'Syn-Ake', 'longevity', 'peptide', 'Dipeptide diaminobutyroyl benzylamide, topical'),
  c('syn-coll', 'Syn-Coll', 'longevity', 'peptide', 'Palmitoyl tripeptide-5, topical'),

  // ---- GLP-1 brands ------------------------------------------------------------------------
  c('ozempic', 'Ozempic', 'weight', 'brand', 'Semaglutide', { peptideId: 'semaglutide' }),
  c('wegovy', 'Wegovy', 'weight', 'brand', 'Semaglutide', { peptideId: 'semaglutide' }),
  c('mounjaro', 'Mounjaro', 'weight', 'brand', 'Tirzepatide', { peptideId: 'tirzepatide' }),
  c('zepbound', 'Zepbound', 'weight', 'brand', 'Tirzepatide', { peptideId: 'tirzepatide' }),
  c('saxenda', 'Saxenda', 'weight', 'brand', 'Liraglutide', { peptideId: 'liraglutide' }),
  c('victoza', 'Victoza', 'weight', 'brand', 'Liraglutide', { peptideId: 'liraglutide' }),
  c('trulicity', 'Trulicity', 'weight', 'brand', 'Dulaglutide'),

  // ---- Hormones ----------------------------------------------------------------------------
  c('testosterone', 'Testosterone', 'hormonal', 'hormone', 'TRT, unspecified ester'),
  c('testosterone-cypionate', 'Testosterone cypionate', 'hormonal', 'hormone'),
  c('testosterone-enanthate', 'Testosterone enanthate', 'hormonal', 'hormone'),
  c('testosterone-propionate', 'Testosterone propionate', 'hormonal', 'hormone'),
  c('testosterone-undecanoate-inj', 'Testosterone undecanoate (injectable)', 'hormonal', 'hormone'),
  c('testosterone-undecanoate-oral', 'Testosterone undecanoate (oral)', 'hormonal', 'hormone'),
  c('testosterone-suspension', 'Testosterone (aqueous suspension)', 'hormonal', 'hormone'),
  c('testosterone-gel', 'Testosterone gel (transdermal)', 'hormonal', 'hormone'),
  c('sustanon-250', 'Sustanon 250', 'hormonal', 'hormone', 'Testosterone ester blend'),
  c('nandrolone-decanoate', 'Nandrolone decanoate', 'hormonal', 'hormone'),
  c('npp', 'Nandrolone phenylpropionate', 'hormonal', 'hormone', 'NPP'),
  c('estradiol-oral', 'Estradiol (oral)', 'hormonal', 'hormone'),
  c('estradiol-transdermal', 'Estradiol (transdermal)', 'hormonal', 'hormone'),
  c('estradiol-valerate', 'Estradiol valerate', 'hormonal', 'hormone'),
  c('estradiol-cypionate', 'Estradiol cypionate', 'hormonal', 'hormone'),
  c('anastrozole', 'Anastrozole', 'hormonal', 'compound', 'Aromatase inhibitor'),

  // ---- Longevity & antioxidant -------------------------------------------------------------
  c('glutathione', 'Glutathione', 'longevity', 'compound', 'Master antioxidant'),
  c('nadh', 'NADH', 'longevity', 'compound', 'Reduced NAD'),
  c('nmn', 'NMN', 'longevity', 'compound', 'Nicotinamide mononucleotide'),
  c('nr', 'NR', 'longevity', 'compound', 'Nicotinamide riboside'),

  // ---- Metabolic & sleep supplements --------------------------------------------------------
  c('l-carnitine', 'L-Carnitine', 'weight', 'compound'),
  c('metformin', 'Metformin', 'weight', 'compound'),
  c('melatonin', 'Melatonin', 'sleep', 'compound'),

  // ---- Vitamins & minerals -----------------------------------------------------------------
  c('vitamin-a', 'Vitamin A', 'vitamins', 'vitamin', 'Retinol'),
  c('vitamin-b1', 'Vitamin B1', 'vitamins', 'vitamin', 'Thiamine'),
  c('vitamin-b2', 'Vitamin B2', 'vitamins', 'vitamin', 'Riboflavin'),
  c('vitamin-b3', 'Vitamin B3', 'vitamins', 'vitamin', 'Niacin'),
  c('vitamin-b5', 'Vitamin B5', 'vitamins', 'vitamin', 'Pantothenic acid'),
  c('vitamin-b6', 'Vitamin B6', 'vitamins', 'vitamin', 'Pyridoxine'),
  c('vitamin-b7', 'Vitamin B7', 'vitamins', 'vitamin', 'Biotin'),
  c('vitamin-b9', 'Vitamin B9', 'vitamins', 'vitamin', 'Folate'),
  c('vitamin-b12', 'Vitamin B12', 'vitamins', 'vitamin', 'Cobalamin'),
  c('vitamin-c', 'Vitamin C', 'vitamins', 'vitamin', 'Ascorbic acid'),
  c('vitamin-d3', 'Vitamin D3', 'vitamins', 'vitamin', 'Cholecalciferol'),
  c('vitamin-e', 'Vitamin E', 'vitamins', 'vitamin', 'Tocopherol'),
  c('vitamin-k1', 'Vitamin K1', 'vitamins', 'vitamin', 'Phylloquinone'),
  c('vitamin-k2', 'Vitamin K2', 'vitamins', 'vitamin', 'MK-7'),
  c('magnesium', 'Magnesium', 'vitamins', 'vitamin'),
  c('zinc', 'Zinc', 'vitamins', 'vitamin'),
  c('calcium', 'Calcium', 'vitamins', 'vitamin'),
  c('copper', 'Copper', 'vitamins', 'vitamin'),
  c('iron', 'Iron', 'vitamins', 'vitamin', 'Ferrous sulfate'),
  c('iodine', 'Iodine', 'vitamins', 'vitamin', 'Potassium iodide'),
  c('potassium', 'Potassium', 'vitamins', 'vitamin'),
  c('selenium', 'Selenium', 'vitamins', 'vitamin', 'Selenomethionine'),
];

const popularRank = new Map(POPULAR.map((id, i) => [id, i]));

/** Popular first, then A→Z. */
export function sortCompounds(list: Compound[]): Compound[] {
  return [...list].sort((a, b) => {
    const ra = popularRank.get(a.id) ?? Infinity;
    const rb = popularRank.get(b.id) ?? Infinity;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

export function searchCompounds(list: Compound[], query: string, category: CompoundCategoryId | 'all' | 'popular'): Compound[] {
  const q = query.trim().toLowerCase();
  return list.filter((x) => {
    if (category === 'popular' && !popularRank.has(x.id)) return false;
    if (category !== 'all' && category !== 'popular' && x.category !== category) return false;
    if (!q) return true;
    const nickname = x.peptideId ? peptideById(x.peptideId)?.nickname ?? '' : '';
    return [x.name, x.aka ?? '', nickname, compoundCategoryById(x.category).label].some((s) => s.toLowerCase().includes(q));
  });
}

// ---- custom compounds ----------------------------------------------------------------------

const CUSTOM_KEY = 'pepmaxing.compounds.custom.v1';
let custom: Compound[] = [];
let customHydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const persistCustom = () => AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)).catch(() => {});

export const customCompoundsStore = {
  get: () => custom,
  hydrate(): Promise<void> {
    if (!customHydrated) {
      customHydrated = AsyncStorage.getItem(CUSTOM_KEY)
        .then((raw) => {
          if (!raw) return;
          custom = JSON.parse(raw) as Compound[];
          emit();
        })
        .catch(() => {});
    }
    return customHydrated;
  },
  add(name: string, category: CompoundCategoryId): Compound {
    const id = `custom-${Date.now().toString(36)}`;
    const entry: Compound = { id, name: name.trim(), category, kind: 'compound', custom: true };
    custom = [...custom, entry];
    emit();
    persistCustom();
    return entry;
  },
  remove(id: string) {
    custom = custom.filter((x) => x.id !== id);
    emit();
    persistCustom();
  },
  /** Adopts a merged list (cloud sync). */
  replace(next: Compound[]) {
    custom = next;
    emit();
    persistCustom();
  },
  reset() {
    custom = [];
    emit();
    persistCustom();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    customCompoundsStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function useCustomCompounds(): Compound[] {
  return useSyncExternalStore(customCompoundsStore.subscribe, customCompoundsStore.get, customCompoundsStore.get);
}

export const compoundById = (id: string) => COMPOUNDS.find((x) => x.id === id) ?? custom.find((x) => x.id === id);

/** Colour a compound is drawn in: its category's. */
export const compoundColor = (compound: Compound) => compoundCategoryById(compound.category).color;

/**
 * Elimination half-lives (hours) where they are well documented — prescribing information or
 * published phase 1 pharmacokinetics. Anything without a solid figure is deliberately absent, so
 * the "Level" estimate stays honest instead of guessing.
 */
const HALF_LIFE_HOURS: Record<string, number> = {
  semaglutide: 168, // ~1 week (label)
  tirzepatide: 120, // ~5 days (label)
  retatrutide: 144, // ~6 days (phase 1)
  liraglutide: 13, // label
  dulaglutide: 113, // ~4.7 days (label)
  exenatide: 2.4, // label
  cagrilintide: 168, // ~7 days (phase 1)
  'cjc-1295-dac': 168, // ~6–8 days with DAC
  ipamorelin: 2,
  'mk-677': 5, // ibutamoren, ~4–6 h
  somatropin: 3.8, // subcutaneous
  'pt-141': 2.7, // bremelanotide label
  hcg: 33,
  'testosterone-cypionate': 192, // ~8 days
  'testosterone-enanthate': 108, // ~4.5 days
  'testosterone-propionate': 19, // ~0.8 days
  'testosterone-undecanoate-inj': 816, // ~34 days
  'nandrolone-decanoate': 192, // ~6–12 days
  npp: 65, // ~2.7 days
  anastrozole: 50,
  metformin: 6.2,
};

/** Half-life in hours, following a brand back to its active compound; undefined when not established. */
export function halfLifeHours(compound: Compound): number | undefined {
  return HALF_LIFE_HOURS[compound.id] ?? (compound.peptideId ? HALF_LIFE_HOURS[compound.peptideId] : undefined);
}

/** Sensible starting point for "how you take it"; always editable. */
export function defaultAdministration(compound: Compound): 'injection' | 'pen' | 'oral' | 'nasal' | 'topical' {
  if (compound.kind === 'brand') return 'pen';
  if (compound.kind === 'vitamin') return 'oral';
  if (compound.kind === 'hormone') return /gel|transdermal|oral/i.test(compound.name) ? (/gel|transdermal/i.test(compound.name) ? 'topical' : 'oral') : 'injection';
  if (compound.kind === 'compound') return 'oral';
  const route = compound.peptideId ? peptideById(compound.peptideId)?.route : undefined;
  if (route === 'Oral') return 'oral';
  if (route === 'Nasal') return 'nasal';
  if (route === 'Topical' || /topical/i.test(compound.aka ?? '')) return 'topical';
  return 'injection';
}

const IU_DOSED = new Set(['somatropin', 'hcg', 'vitamin-d3', 'vitamin-a', 'vitamin-e']);
const MCG_DOSED = new Set([
  'bpc-157', 'tb-500', 'ipamorelin', 'cjc-1295', 'cjc-1295-dac', 'sermorelin', 'ghrp-2', 'ghrp-6', 'hexarelin', 'hgh-frag-176-191', 'aod-9604', 'mots-c',
  'semax', 'selank', 'dsip', 'kisspeptin-10', 'epitalon', 'igf-1-lr3', 'igf-1-des', 'peg-mgf', 'mgf', 'ss-31', 'humanin', 'pinealon', 'vilon', 'thymalin',
  'kpv', 'ara-290', 'll-37', 'vip', 'pt-141', 'melanotan-ii', 'melanotan-i', 'gonadorelin', 'triptorelin', 'b7-33',
  'vitamin-b12', 'vitamin-b9', 'vitamin-b7', 'vitamin-k2', 'iodine', 'selenium',
]);

/** Unit people actually dose this in. */
export function defaultUnit(compound: Compound): 'mg' | 'mcg' | 'IU' | 'units' {
  if (IU_DOSED.has(compound.id)) return 'IU';
  if (compound.id === 'insulin') return 'units';
  return MCG_DOSED.has(compound.id) ? 'mcg' : 'mg';
}
