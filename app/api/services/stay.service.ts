import type { AvailabilityMap } from '@/lib/rooms';
import type { QuoteResponse } from '@/types/stay.types';

import BaseService from './base.service';

const enc = encodeURIComponent;

export interface RoomQuoteParams {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  extraBed: boolean;
}

export interface AvailabilityParams {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /** Room ids to check. Empty means every room. */
  rooms: string[];
}

/** Typed fetch helpers for the room detail page. Prices always come from the server. */
class StayService extends BaseService {
  constructor() {
    super('/rooms');
  }

  quote(slug: string, p: RoomQuoteParams) {
    return this.httpGet<QuoteResponse>(`/${enc(slug)}/quote`, {
      params: {
        checkIn: p.checkIn,
        checkOut: p.checkOut,
        adults: p.adults,
        children: p.children,
        extraBed: p.extraBed ? '1' : '0',
      },
    });
  }

  /** Availability for the room list and the enquiry hint. Never a commitment: checkout re-checks. */
  availability(p: AvailabilityParams) {
    return this.httpGet<AvailabilityMap>('/availability', {
      params: {
        checkIn: p.checkIn,
        checkOut: p.checkOut,
        adults: p.adults,
        children: p.children,
        rooms: p.rooms.join(','),
      },
    });
  }
}

export const stayService = new StayService();
