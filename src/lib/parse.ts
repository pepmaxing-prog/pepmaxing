/**
 * Parses a positive decimal typed by the user. Unlike `Number.parseFloat` this rejects trailing
 * garbage ("80abc"), which decimal keypads allow through on some platforms and web keyboards.
 */
export function parsePositiveNumber(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}
