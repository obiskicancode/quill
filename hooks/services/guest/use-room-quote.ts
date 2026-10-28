'use client';

import { useQuery } from '@tanstack/react-query';

import { stayService } from '@/app/api/services/stay.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type { ISODate } from '@/types/dates.types';
import type { QuoteResponse, StayInput } from '@/types/stay.types';

export type QuoteState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ready'; data: QuoteResponse }
  | { status: 'error' };

type ValidStay = StayInput & { checkIn: ISODate; checkOut: ISODate };

function validStay(stay: StayInput | null): stay is ValidStay {
  return Boolean(stay?.checkIn && stay.checkOut);
}

/** Asks the server for the price breakdown whenever the stay changes. Never calculates prices itself. */
export function useQuote(slug: string, stay: StayInput | null) {
  const query = useQuery({
    queryKey: validStay(stay)
      ? queryKeys.guest.roomQuote(slug, stay)
      : queryKeys.guest.roomQuote(slug, {
          checkIn: '',
          checkOut: '',
          adults: 0,
          children: 0,
          extraBed: false,
        }),
    queryFn: async (): Promise<QuoteResponse> => {
      if (!validStay(stay)) {
        throw new Error('A valid stay is required to load a quote.');
      }
      const response = await stayService.quote(slug, {
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: stay.adults,
        children: stay.children,
        extraBed: stay.extraBed,
      });
      return response.data;
    },
    enabled: validStay(stay),
    staleTime: 30_000,
  });

  const state: QuoteState = !validStay(stay)
    ? { status: 'idle' }
    : query.isPending
      ? { status: 'checking' }
      : query.isError
        ? { status: 'error' }
        : { status: 'ready', data: query.data };

  return {
    state,
    retry: () => {
      void query.refetch();
    },
  };
}
