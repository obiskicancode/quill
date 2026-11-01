import type { RevenueRange } from '@/types/dashboard.types';

type StayKey = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
};

type RoomQuoteKey = StayKey & {
  extraBed: boolean;
};

type CheckoutQuoteKey = RoomQuoteKey & {
  room: string;
  extras: Array<{ id: string; quantity: number }>;
};

export const queryKeys = {
  guest: {
    all: ['guest'] as const,
    availability: (stay: StayKey, roomIds: string[]) =>
      [
        'guest',
        'availability',
        stay.checkIn,
        stay.checkOut,
        stay.adults,
        stay.children,
        [...roomIds].sort(),
      ] as const,
    roomQuote: (slug: string, stay: RoomQuoteKey) =>
      [
        'guest',
        'room-quote',
        slug,
        stay.checkIn,
        stay.checkOut,
        stay.adults,
        stay.children,
        stay.extraBed,
      ] as const,
    checkout: {
      all: ['guest', 'checkout'] as const,
      quote: (input: CheckoutQuoteKey) =>
        [
          'guest',
          'checkout',
          'quote',
          input.room,
          input.checkIn,
          input.checkOut,
          input.adults,
          input.children,
          input.extraBed,
          [...input.extras]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((extra) => [extra.id, extra.quantity] as const),
        ] as const,
      status: (reference: string) =>
        ['guest', 'checkout', 'status', reference] as const,
    },
    booking: (reference: string) => ['guest', 'booking', reference] as const,
    bookingStatus: (reference: string) =>
      ['guest', 'booking', 'status', reference] as const,
    manage: (reference: string) => ['guest', 'manage', reference] as const,
    cancellationPreview: (reference: string) =>
      ['guest', 'manage', reference, 'cancellation-preview'] as const,
    changeQuote: (reference: string, checkIn: string, checkOut: string) =>
      [
        'guest',
        'manage',
        reference,
        'change-quote',
        checkIn,
        checkOut,
      ] as const,
  },
  admin: {
    all: ['admin'] as const,
    account: {
      all: ['admin', 'account'] as const,
      sessions: () => ['admin', 'account', 'sessions'] as const,
    },
    dashboard: {
      all: ['admin', 'dashboard'] as const,
      summaries: () => ['admin', 'dashboard', 'summary'] as const,
      summary: (date?: string) =>
        ['admin', 'dashboard', 'summary', date ?? 'today'] as const,
      occupancy: (from?: string, days = 14) =>
        ['admin', 'dashboard', 'occupancy', from ?? 'today', days] as const,
      revenue: (range: RevenueRange) =>
        ['admin', 'dashboard', 'revenue', range] as const,
    },
    enquiries: {
      all: ['admin', 'enquiries'] as const,
      newCount: () => ['admin', 'enquiries', 'new-count'] as const,
    },
    reservations: {
      all: ['admin', 'reservations'] as const,
      lists: () => ['admin', 'reservations', 'list'] as const,
      list: (queryString: string) =>
        ['admin', 'reservations', 'list', queryString] as const,
      details: () => ['admin', 'reservations', 'detail'] as const,
      detail: (id: string) => ['admin', 'reservations', 'detail', id] as const,
      neighbors: (id: string, queryString: string) =>
        ['admin', 'reservations', 'neighbors', id, queryString] as const,
      cancellationPreview: (id: string) =>
        ['admin', 'reservations', id, 'cancellation-preview'] as const,
      changeQuote: (
        id: string,
        input: { checkIn: string; checkOut: string; extraBed?: boolean },
      ) =>
        [
          'admin',
          'reservations',
          id,
          'change-quote',
          input.checkIn,
          input.checkOut,
          input.extraBed ?? false,
        ] as const,
      availableRooms: (queryString: string) =>
        ['admin', 'reservations', 'available-rooms', queryString] as const,
      quote: (queryString: string) =>
        ['admin', 'reservations', 'quote', queryString] as const,
    },
    calendar: {
      all: ['admin', 'calendar'] as const,
      range: (from?: string, days = 14, roomTypeId?: string) =>
        [
          'admin',
          'calendar',
          from ?? 'today',
          days,
          roomTypeId ?? 'all',
        ] as const,
      day: (date: string) => ['admin', 'calendar', 'day', date] as const,
    },
    blocks: {
      all: ['admin', 'blocks'] as const,
      lists: () => ['admin', 'blocks', 'list'] as const,
      list: (queryString: string) =>
        ['admin', 'blocks', 'list', queryString] as const,
      conflicts: (input: {
        roomIds: string[];
        startDate: string;
        endDate: string;
        excludeBlockId?: string;
      }) =>
        [
          'admin',
          'blocks',
          'conflicts',
          [...input.roomIds].sort(),
          input.startDate,
          input.endDate,
          input.excludeBlockId ?? 'none',
        ] as const,
    },
    payments: {
      all: ['admin', 'payments'] as const,
      summary: (queryString: string) =>
        ['admin', 'payments', 'summary', queryString] as const,
      lists: () => ['admin', 'payments', 'list'] as const,
      list: (queryString: string) =>
        ['admin', 'payments', 'list', queryString] as const,
      details: () => ['admin', 'payments', 'detail'] as const,
      detail: (id: string) => ['admin', 'payments', 'detail', id] as const,
      refunds: (queryString: string) =>
        ['admin', 'payments', 'refunds', queryString] as const,
      webhooks: (queryString: string) =>
        ['admin', 'payments', 'webhooks', queryString] as const,
    },
    staff: {
      all: ['admin', 'staff'] as const,
      lists: () => ['admin', 'staff', 'list'] as const,
      list: (queryString: string) =>
        ['admin', 'staff', 'list', queryString] as const,
      details: () => ['admin', 'staff', 'detail'] as const,
      detail: (id: string) => ['admin', 'staff', 'detail', id] as const,
    },
    audit: {
      all: ['admin', 'audit'] as const,
      lists: () => ['admin', 'audit', 'list'] as const,
      list: (queryString: string) =>
        ['admin', 'audit', 'list', queryString] as const,
      detail: (id: string) => ['admin', 'audit', 'detail', id] as const,
    },
    inventory: {
      all: ['admin', 'inventory'] as const,
      roomTypes: () => ['admin', 'inventory', 'room-types'] as const,
      roomType: (id: string) =>
        ['admin', 'inventory', 'room-type', id] as const,
      amenities: () => ['admin', 'inventory', 'amenities'] as const,
      extras: () => ['admin', 'inventory', 'extras'] as const,
      rateRules: (roomTypeId?: string) =>
        ['admin', 'inventory', 'rate-rules', roomTypeId ?? 'all'] as const,
      priceCalendar: (roomTypeId: string, startDate?: string, days = 90) =>
        [
          'admin',
          'inventory',
          'price-calendar',
          roomTypeId,
          startDate ?? 'today',
          days,
        ] as const,
      rateRuleOverlap: (input: unknown) =>
        ['admin', 'inventory', 'rate-rule-overlap', input] as const,
      pricingQuote: (input: unknown) =>
        ['admin', 'inventory', 'pricing-quote', input] as const,
    },
  },
};
