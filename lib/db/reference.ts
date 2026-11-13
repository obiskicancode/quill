/**
 * Human-facing identifier generation. Randomness is deliberately non-secure;
 * these values are for display and lookup, never for authorization.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a `QUILL-XXXXXX` booking reference from an unambiguous alphabet
 * (no I/L/O/0/1). Uniqueness is enforced by the database, not this function.
 */
export function createReference(): string {
  let ref = 'QUILL-';
  for (let i = 0; i < 6; i++) {
    ref += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return ref;
}

/** Generates a prefixed internal ID (e.g. `pay_ab12cd34`); not a UUID. */
export const newId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
