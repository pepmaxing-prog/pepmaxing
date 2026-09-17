import type { Medication } from './types';

/**
 * App-owned catalogue, bundled so the app works offline and before Firestore exists.
 * Half-lives are the published mean terminal half-life for subcutaneous dosing.
 */
export const MEDICATIONS: Medication[] = [
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    halfLifeHours: 165,
    defaultUnit: 'mg',
    category: 'glp1',
    typicalDose: 1,
    maxDose: 2.4,
  },
  {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    halfLifeHours: 117,
    defaultUnit: 'mg',
    category: 'glp1',
    typicalDose: 7.5,
    maxDose: 15,
  },
  {
    id: 'retatrutide',
    name: 'Retatrutide',
    halfLifeHours: 144,
    defaultUnit: 'mg',
    category: 'glp1',
    typicalDose: 4,
    maxDose: 12,
  },
  {
    id: 'liraglutide',
    name: 'Liraglutide',
    halfLifeHours: 13,
    defaultUnit: 'mg',
    category: 'glp1',
    typicalDose: 1.8,
    maxDose: 3,
  },
  {
    id: 'cagrilintide',
    name: 'Cagrilintide',
    halfLifeHours: 159,
    defaultUnit: 'mg',
    category: 'glp1',
    typicalDose: 2.4,
    maxDose: 4.5,
  },
  {
    id: 'bpc-157',
    name: 'BPC-157',
    halfLifeHours: 4,
    defaultUnit: 'mcg',
    category: 'peptide',
    typicalDose: 250,
    maxDose: 500,
  },
  {
    id: 'tb-500',
    name: 'TB-500',
    halfLifeHours: 48,
    defaultUnit: 'mg',
    category: 'peptide',
    typicalDose: 2.5,
    maxDose: 5,
  },
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    halfLifeHours: 2,
    defaultUnit: 'mcg',
    category: 'peptide',
    typicalDose: 300,
    maxDose: 600,
  },
  {
    id: 'cjc-1295',
    name: 'CJC-1295 (DAC)',
    halfLifeHours: 168,
    defaultUnit: 'mcg',
    category: 'peptide',
    typicalDose: 2000,
    maxDose: 2000,
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    halfLifeHours: 0.6,
    defaultUnit: 'mg',
    category: 'peptide',
    typicalDose: 2,
    maxDose: 2,
  },
  {
    id: 'other',
    name: 'Other',
    halfLifeHours: 24,
    defaultUnit: 'mg',
    category: 'other',
  },
];

const BY_ID = new Map(MEDICATIONS.map((medication) => [medication.id, medication]));

export function getMedication(id: string): Medication | undefined {
  return BY_ID.get(id);
}

export function medicationName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}
