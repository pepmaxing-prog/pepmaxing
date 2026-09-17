import { bmi, bmiCategory, bodyComposition, fatLossShare, navyBodyFatPercent } from '@/lib/body-composition';

describe('navyBodyFatPercent', () => {
  it('matches the published male reference', () => {
    // 180 cm, 90 cm waist, 40 cm neck ≈ 18.4% by the US Navy formula.
    const percent = navyBodyFatPercent({ sex: 'male', heightCm: 180, waistCm: 90, neckCm: 40 });
    expect(percent).toBeCloseTo(18.4, 1);
  });

  it('matches the published female reference', () => {
    const percent = navyBodyFatPercent({
      sex: 'female',
      heightCm: 165,
      waistCm: 75,
      neckCm: 33,
      hipCm: 100,
    });
    expect(percent).toBeCloseTo(29.4, 1);
  });

  it('needs a hip measurement for women', () => {
    expect(navyBodyFatPercent({ sex: 'female', heightCm: 165, waistCm: 75, neckCm: 33 })).toBeNull();
  });

  it('rejects impossible inputs', () => {
    expect(navyBodyFatPercent({ sex: 'male', heightCm: 0, waistCm: 90, neckCm: 40 })).toBeNull();
    expect(navyBodyFatPercent({ sex: 'male', heightCm: 180, waistCm: 35, neckCm: 40 })).toBeNull();
  });

  it('drops out-of-range results instead of reporting nonsense', () => {
    expect(navyBodyFatPercent({ sex: 'male', heightCm: 140, waistCm: 400, neckCm: 30 })).toBeNull();
  });
});

describe('bodyComposition', () => {
  it('splits weight into fat and lean mass', () => {
    expect(bodyComposition(100, 25)).toEqual({ fatMassKg: 25, leanMassKg: 75 });
  });
});

describe('fatLossShare', () => {
  it('reports the share of lost weight that was fat', () => {
    // 100 kg @ 30% -> 90 kg @ 25%: 30 kg fat -> 22.5 kg fat, so 7.5 of the 10 kg lost was fat.
    expect(fatLossShare({ weightKg: 100, bodyFatPercent: 30 }, { weightKg: 90, bodyFatPercent: 25 })).toBeCloseTo(0.75);
  });

  it('is null when no weight was lost', () => {
    expect(fatLossShare({ weightKg: 90, bodyFatPercent: 25 }, { weightKg: 92, bodyFatPercent: 25 })).toBeNull();
  });

  it('clamps to zero when body fat went up despite the weight loss', () => {
    expect(fatLossShare({ weightKg: 100, bodyFatPercent: 30 }, { weightKg: 90, bodyFatPercent: 36 })).toBe(0);
  });
});

describe('bmi', () => {
  it('computes and categorises', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.9, 1);
    expect(bmiCategory(22.9)).toBe('healthy');
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(27)).toBe('overweight');
    expect(bmiCategory(31)).toBe('obese');
  });

  it('rejects zero inputs', () => {
    expect(bmi(0, 175)).toBeNull();
  });
});
