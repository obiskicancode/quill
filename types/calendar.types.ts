import { z } from 'zod';

export type BlockReason = 'maintenance' | 'owner_hold' | 'renovation' | 'other';

export const BLOCK_REASONS: BlockReason[] = [
  'maintenance',
  'owner_hold',
  'renovation',
  'other',
];

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  maintenance: 'Maintenance',
  owner_hold: 'Owner Hold',
  renovation: 'Renovation',
  other: 'Other Block',
};

export interface CalendarRoom {
  id: string;
  roomNumber: string;
  floor: string | null;
  status: 'active' | 'maintenance' | 'inactive';
  roomTypeId: string;
  roomTypeName: string;
  roomTypeSlug: string;
  sortOrder: number;
}

export interface CalendarReservationBar {
  id: string;
  reference: string;
  roomId: string;
  checkIn: string; // Inclusive YYYY-MM-DD
  checkOut: string; // Exclusive YYYY-MM-DD
  status:
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'checked_out'
    | 'cancelled'
    | 'no_show'
    | 'expired';
  guestName: string;
  paymentState: 'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded';
  holdExpiresAt: string | null;
  isStaleHold: boolean;
}

export interface CalendarBlockBar {
  id: string;
  roomId: string;
  startDate: string; // Inclusive YYYY-MM-DD
  endDate: string; // Exclusive YYYY-MM-DD
  reason: BlockReason;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarNightStat {
  date: string;
  totalRooms: number;
  sellableRooms: number;
  occupiedRooms: number;
  occupancyPercent: number;
  arrivalsCount: number;
  departuresCount: number;
  freeByType: Record<string, { total: number; free: number }>;
}

export interface CalendarResponse {
  from: string;
  days: number;
  to: string;
  today: string;
  timezone: string;
  rooms: CalendarRoom[];
  roomTypes: {
    id: string;
    name: string;
    slug: string;
    totalRooms: number;
  }[];
  reservations: CalendarReservationBar[];
  blocks: CalendarBlockBar[];
  stats: CalendarNightStat[];
}

export interface CalendarDayArrivalDeparture {
  id: string;
  reference: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
}

export interface CalendarDayResponse {
  date: string;
  arrivals: CalendarDayArrivalDeparture[];
  departures: CalendarDayArrivalDeparture[];
  inHouse: CalendarDayArrivalDeparture[];
  freeRoomsByType: {
    roomTypeId: string;
    roomTypeName: string;
    freeCount: number;
    totalCount: number;
    availableRooms: { id: string; roomNumber: string }[];
  }[];
  blocks: {
    id: string;
    roomId: string;
    roomNumber: string;
    roomTypeName: string;
    reason: BlockReason;
    notes: string | null;
    startDate: string;
    endDate: string;
  }[];
}

export interface BlockCheckConflict {
  roomId: string;
  roomNumber: string;
  type: 'reservation' | 'block';
  id: string;
  reference?: string;
  guestName?: string;
  startDate: string;
  endDate: string;
  status?: string;
  reason?: string;
}

export interface BlockCheckResponse {
  ok: boolean;
  conflicts: BlockCheckConflict[];
}

export interface RoomBlockListItem {
  id: string;
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  startDate: string;
  endDate: string;
  nights: number;
  reason: BlockReason;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomBlocksListResponse {
  blocks: RoomBlockListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== ZOD SCHEMAS ====================

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const adminBlockCheckSchema = z
  .object({
    roomIds: z.array(z.string().uuid()).min(1, 'Select at least one room.'),
    startDate: z
      .string()
      .regex(dateRegex, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(dateRegex, 'Invalid end date format (YYYY-MM-DD)'),
    excludeBlockId: z.string().uuid().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export type AdminBlockCheckInput = z.infer<typeof adminBlockCheckSchema>;

export const adminCreateBlockSchema = z
  .object({
    roomIds: z.array(z.string().uuid()).min(1, 'Select at least one room.'),
    startDate: z
      .string()
      .regex(dateRegex, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(dateRegex, 'Invalid end date format (YYYY-MM-DD)'),
    reason: z.enum([
      'maintenance',
      'owner_hold',
      'renovation',
      'other',
    ] as const),
    notes: z
      .string()
      .max(1000, 'Notes must be 1,000 characters or less.')
      .optional(),
    backdateReason: z.string().max(500).optional(),
    idempotencyKey: z.string().min(1, 'Missing idempotency key.'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export type AdminCreateBlockInput = z.infer<typeof adminCreateBlockSchema>;

export const adminUpdateBlockSchema = z
  .object({
    roomId: z.string().uuid('Invalid room ID.'),
    startDate: z
      .string()
      .regex(dateRegex, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(dateRegex, 'Invalid end date format (YYYY-MM-DD)'),
    reason: z.enum([
      'maintenance',
      'owner_hold',
      'renovation',
      'other',
    ] as const),
    notes: z
      .string()
      .max(1000, 'Notes must be 1,000 characters or less.')
      .optional(),
    backdateReason: z.string().max(500).optional(),
    version: z.string().min(1, 'Missing version token.'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export type AdminUpdateBlockInput = z.infer<typeof adminUpdateBlockSchema>;

export const adminBlocksListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  roomTypeId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  reason: z
    .enum(['maintenance', 'owner_hold', 'renovation', 'other'] as const)
    .optional(),
  status: z
    .enum(['all', 'upcoming', 'current', 'past'] as const)
    .default('all'),
});

export type AdminBlocksListQueryInput = z.infer<
  typeof adminBlocksListQuerySchema
>;
