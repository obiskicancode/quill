'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { checkoutService } from '@/app/api/services/checkout.service';
import { queryKeys } from '@/hooks/services/query-keys';
import { TERMINAL_STATUSES } from '@/lib/booking/status';
import type {
  HoldUpdateInput,
  ReservationRequestInput,
} from '@/schemas/checkout.schema';
import type {
  PaymentInitRequest,
  QuoteRequest,
  ReservationResponse,
  StatusResponse,
} from '@/types/checkout.types';

export function useCheckoutQuote() {
  return useMutation({
    mutationFn: async (input: QuoteRequest) => {
      const response = await checkoutService.quote(input);
      return response.data;
    },
  });
}

export function useCreateReservation() {
  return useMutation({
    mutationFn: async (
      input: ReservationRequestInput,
    ): Promise<ReservationResponse> => {
      const response = await checkoutService.createReservation(input);
      return response.data;
    },
  });
}

export function useUpdateHold() {
  return useMutation({
    mutationFn: async ({
      reference,
      body,
    }: {
      reference: string;
      body: HoldUpdateInput;
    }): Promise<ReservationResponse> => {
      const response = await checkoutService.updateHold(reference, body);
      return response.data;
    },
  });
}

export function useInitPayment() {
  return useMutation({
    mutationFn: async (input: PaymentInitRequest) => {
      const response = await checkoutService.initPayment(input);
      return response.data;
    },
  });
}

export function useUploadProof() {
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
  });
}

export function useCheckoutStatus(reference: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.guest.checkout.status(reference ?? ''),
    queryFn: async (): Promise<StatusResponse> => {
      if (!reference) throw new Error('A booking reference is required.');
      const response = await checkoutService.status(reference);
      return response.data;
    },
    enabled: Boolean(reference) && enabled,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data;
      if (status && TERMINAL_STATUSES.has(status.status)) return false;
      return 2000;
    },
  });
}
