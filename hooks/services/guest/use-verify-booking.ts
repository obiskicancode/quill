'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { bookingService } from '@/app/api/services/booking.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type { VerifyRequest } from '@/schemas/booking.schema';

export function useVerifyBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VerifyRequest) => {
      const response = await bookingService.verify(input);
      return response.data;
    },
    onSuccess: (booking) => {
      queryClient.setQueryData(
        queryKeys.guest.booking(booking.reference),
        booking,
      );
    },
  });
}
