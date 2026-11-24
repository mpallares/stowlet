import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U
const PATTERN = /^STOW(-[0-9A-HJKMNP-TV-Z]{5}){5}$/;

/** `STOW-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`, 125 bits from the system CSPRNG. */
export function generateLicenseKey(): string {
  const bytes = randomBytes(25);
  const groups: string[] = [];
  for (let g = 0; g < 5; g++) {
    let group = '';
    for (let i = 0; i < 5; i++) group += ALPHABET[(bytes[g * 5 + i] ?? 0) & 31];
    groups.push(group);
  }
  return `STOW-${groups.join('-')}`;
}

/** Trims and upper-cases pasted input; null when it cannot be a key (no database hit needed). */
export function normalizeLicenseKey(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const key = input.trim().toUpperCase();
  return PATTERN.test(key) ? key : null;
}
