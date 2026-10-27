export const BLOCK_REASONS = [
  'maintenance',
  'owner_hold',
  'renovation',
  'other',
] as const;

export const BLOCK_REASON_LABELS = {
  maintenance: 'Maintenance',
  owner_hold: 'Owner Hold',
  renovation: 'Renovation',
  other: 'Other Block',
} as const;
