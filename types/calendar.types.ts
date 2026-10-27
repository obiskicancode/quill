import type {
  AdminBlockCheckInput as AdminBlockCheckInputSchema,
  AdminBlocksListQueryInput as AdminBlocksListQueryInputSchema,
  AdminCreateBlockInput as AdminCreateBlockInputSchema,
  AdminUpdateBlockInput as AdminUpdateBlockInputSchema,
} from '@/schemas/calendar.schema';

export type BlockReason = 'maintenance' | 'owner_hold' | 'renovation' | 'other';

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

export type AdminBlockCheckInput = AdminBlockCheckInputSchema;
export type AdminCreateBlockInput = AdminCreateBlockInputSchema;
export type AdminUpdateBlockInput = AdminUpdateBlockInputSchema;
export type AdminBlocksListQueryInput = AdminBlocksListQueryInputSchema;
