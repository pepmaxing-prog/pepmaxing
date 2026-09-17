import type { LengthUnit, WeightUnit } from '@/data/types';

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

/** Weight is stored in kg; convert for display only. */
export function displayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** Lengths are stored in cm; convert for display only. */
export function displayLength(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cmToIn(cm);
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  return `${displayWeight(kg, unit).toFixed(decimals)} ${unit}`;
}

export function formatLength(cm: number, unit: LengthUnit, decimals = 1): string {
  return `${displayLength(cm, unit).toFixed(decimals)} ${unit === 'cm' ? 'cm' : 'in'}`;
}

/** Feet + inches, for height entry in imperial. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cmToIn(cm));
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches);
}
