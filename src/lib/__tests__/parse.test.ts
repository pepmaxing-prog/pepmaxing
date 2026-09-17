import { parsePositiveNumber } from '../parse';

describe('parsePositiveNumber', () => {
  it('accepts decimals with either separator', () => {
    expect(parsePositiveNumber('2.5')).toBe(2.5);
    expect(parsePositiveNumber('2,5')).toBe(2.5);
    expect(parsePositiveNumber(' 80 ')).toBe(80);
    expect(parsePositiveNumber('.5')).toBe(0.5);
  });

  it('rejects trailing garbage', () => {
    expect(parsePositiveNumber('80abc')).toBeNull();
    expect(parsePositiveNumber('2.5abc')).toBeNull();
    expect(parsePositiveNumber('1e3')).toBeNull();
  });

  it('rejects empty, zero and negative input', () => {
    expect(parsePositiveNumber('')).toBeNull();
    expect(parsePositiveNumber('abc')).toBeNull();
    expect(parsePositiveNumber('0')).toBeNull();
    expect(parsePositiveNumber('-5')).toBeNull();
  });
});
