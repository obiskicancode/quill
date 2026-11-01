'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bookingService } from '@/app/api/services/booking.service';
import { checkoutService } from '@/app/api/services/checkout.service';
import { queryKeys } from '@/hooks/services/query-keys';
import { TERMINAL_STATUSES } from '@/lib/booking/status';
import type { GuestReservation } from '@/types/booking.types';
import type { StatusResponse } from '@/types/checkout.types';

export function useGuestBooking(
  reference: string,
  initialData: GuestReservation,
) {
  return useQuery({
    queryKey: queryKeys.guest.booking(reference),
    queryFn: async () => {
      const response = await bookingService.get(reference);
      return response.data;
    },
    initialData,
    staleTime: 0,
  });
}

export function useGuestBookingStatus(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.guest.bookingStatus(reference),
    queryFn: async (): Promise<StatusResponse> => {
      const response = await bookingService.status(reference);
      return response.data;
    },
    enabled,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data;
      if (status && TERMINAL_STATUSES.has(status.status)) return false;
      return 2000;
    },
  });
}

export function useResendConfirmation() {
  return useMutation({
    mutationFn: async (reference: string) => {
      const response = await bookingService.resend(reference);
      return response.data;
    },
  });
}

export function useUploadBookingProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reference,
      file,
    }: {
      reference: string;
      file: File;
    }) => {
      const response = await checkoutService.uploadProof(reference, file);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.guest.booking(variables.reference),
      });
    },
  });
}
