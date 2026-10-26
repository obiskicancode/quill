import { z } from 'zod';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export interface DashboardKpi {
  arrivalsToday: number;
  departuresToday: number;
  inHouseTonight: number;
  occupiedRooms: number;
  sellableRooms: number;
  totalRooms: number;
  blockedRooms: number;
  occupancyPercent: number;
}

export type AttentionType =
  | 'bank_transfer_pending'
  | 'reservation_awaiting_approval'
  | 'hold_expiring_soon'
  | 'enquiry_unanswered'
  | 'notification_failed'
  | 'balance_due_arriving_soon';

export interface AttentionItem {
  type: AttentionType;
  count: number;
  label: string;
  oldestAge: string;
  oldestAt: string | null;
  href: string;
  priority: number;
}

export interface DashboardReservationRow {
  id: string;
  reference: string;
  guestName: string;
  roomTypeName: string;
  roomNumber: string;
  nights: number;
  adults: number;
  children: number;
  balanceMinor: number;
  status: ReservationStatus;
  arrivalTime: string | null;
  checkIn: string;
  checkOut: string;
}

export type ActivityEventType =
  | 'new_booking'
  | 'payment_received'
  | 'cancellation'
  | 'new_enquiry'
  | 'check_in'
  | 'check_out';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  label: string;
  relativeTime: string;
  timestamp: string;
  href: string;
}

export interface OccupancyDay {
  date: string;
  occupied: number;
  available: number;
  sellable: number;
  arrivals: number;
  departures: number;
  occupancyPercent: number;
}

export type RevenueRange = 'today' | '7d' | 'this_month' | 'last_month';

export interface RevenuePeriod {
  paymentsReceivedMinor: number;
  newBookings: number;
  avgNightlyRateMinor: number;
  cancellations: number;
}

export interface RevenueData {
  range: RevenueRange;
  current: RevenuePeriod;
  previous: RevenuePeriod;
  changePercent: {
    payments: number;
    bookings: number;
    avgRate: number;
    cancellations: number;
  };
}

export interface DashboardSummaryResponse {
  kpi: DashboardKpi;
  attention: AttentionItem[];
  arrivals: DashboardReservationRow[];
  departures: DashboardReservationRow[];
  activity: ActivityEvent[];
  timezone: string;
  todayDate: string;
  hasRooms: boolean;
}

export interface DashboardOccupancyResponse {
  days: OccupancyDay[];
}

export interface DashboardRevenueResponse {
  revenue: RevenueData;
}

export interface CheckInOutResponse {
  row: DashboardReservationRow;
}

export const dashboardSummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const dashboardOccupancyQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce.number().int().min(1).max(30).default(14),
});

export const dashboardRevenueQuerySchema = z.object({
  range: z.enum(['today', '7d', 'this_month', 'last_month']).default('7d'),
});
