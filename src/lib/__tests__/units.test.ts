import {
  cmToFeetInches,
  feetInchesToCm,
  formatLength,
  formatWeight,
  kgToLb,
  lbToKg,
} from '@/lib/units';

describe('weight conversion', () => {
  it('round-trips', () => {
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5);
  });

  it('formats in the chosen unit', () => {
    expect(formatWeight(80, 'kg')).toBe('80.0 kg');
    expect(formatWeight(80, 'lb')).toBe('176.4 lb');
  });
});

describe('length conversion', () => {
  it('formats in the chosen unit', () => {
    expect(formatLength(180, 'cm', 0)).toBe('180 cm');
    expect(formatLength(180, 'in', 1)).toBe('70.9 in');
  });

  it('round-trips feet and inches', () => {
    const { feet, inches } = cmToFeetInches(180);
    expect({ feet, inches }).toEqual({ feet: 5, inches: 11 });
    expect(feetInchesToCm(5, 11)).toBeCloseTo(180.34);
  });
});
