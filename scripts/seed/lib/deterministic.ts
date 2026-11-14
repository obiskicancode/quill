import { createHash } from 'node:crypto';

export interface SeededRandom {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

function hashToUint32(value: string): number {
  const digest = createHash('sha256').update(value).digest();
  return digest.readUInt32BE(0);
}

export function createSeededRandom(seed: string | number): SeededRandom {
  let state = hashToUint32(String(seed)) || 1;

  const next = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (max <= min) return min;
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      }
      return copy;
    },
  };
}

export function deterministicUuid(seedName: string, key: string): string {
  const hex = createHash('sha1')
    .update(`${seedName}:${key}`)
    .digest('hex')
    .slice(0, 32);
  const versioned = `${hex.slice(0, 12)}5${hex.slice(13)}`;
  const variant = ((parseInt(versioned[16]!, 16) & 0x3) | 0x8).toString(16);
  return [
    versioned.slice(0, 8),
    versioned.slice(8, 12),
    versioned.slice(12, 16),
    `${variant}${versioned.slice(17, 20)}`,
    versioned.slice(20, 32),
  ].join('-');
}

export function seedNow(env = process.env): Date {
  const raw = env.SEED_NOW?.trim();
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`SEED_NOW is not a valid date: ${raw}`);
  }
  return parsed;
}

export function seedRandomSeed(env = process.env): string {
  return env.SEED_RANDOM_SEED?.trim() || 'quill-demo-2026';
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

export function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function atUtc(isoDate: string, hour = 12, minute = 0): Date {
  return new Date(
    `${isoDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`,
  );
}
