'use client';

import { useQuery } from '@tanstack/react-query';

import { stayService } from '@/app/api/services/stay.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type {
  AvailabilityMap,
  RoomType,
  StayParams,
} from '@/types/rooms.types';

type AvailabilityStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useAvailability(rooms: RoomType[], stay: StayParams | null) {
  const roomIds = rooms.map((room) => room.id);
  const query = useQuery({
    queryKey: stay
      ? queryKeys.guest.availability(stay, roomIds)
      : queryKeys.guest.availability(
          { checkIn: '', checkOut: '', adults: 0, children: 0 },
          [],
        ),
    queryFn: async (): Promise<AvailabilityMap> => {
      if (!stay) throw new Error('A stay is required to check availability.');
      const response = await stayService.availability({
        ...stay,
        rooms: roomIds,
      });
      return response.data;
    },
    enabled: Boolean(stay),
    staleTime: 30_000,
  });

  const status: AvailabilityStatus = !stay
    ? 'idle'
    : query.isPending
      ? 'loading'
      : query.isError
        ? 'error'
        : 'ready';

  return {
    status,
    data: query.data ?? null,
    retry: () => {
      void query.refetch();
    },
  };
}
