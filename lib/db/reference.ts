const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function createReference(): string {
  let ref = 'QUILL-';
  for (let i = 0; i < 6; i++) {
    ref += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return ref;
}

export const newId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
