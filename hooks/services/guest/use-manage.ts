'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { manageService } from '@/app/api/services/manage.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type { DetailsRequest } from '@/schemas/manage.schema';
import type { GuestReservation } from '@/types/booking.types';
import type {
  CancellationPreview,
  ChangeQuoteRequest,
  ChangeQuoteResponse,
} from '@/types/manage.types';

export function useManageBooking(
  reference: string,
  initialData: GuestReservation,
  poll = false,
) {
  return useQuery({
    queryKey: queryKeys.guest.manage(reference),
    queryFn: async () => {
      const response = await manageService.get(reference);
      return response.data;
    },
    initialData,
    staleTime: 0,
    refetchInterval: poll ? 3000 : false,
    refetchIntervalInBackground: true,
  });
}

export function useCancellationPreview(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.guest.cancellationPreview(reference),
    queryFn: async (): Promise<CancellationPreview> => {
      const response = await manageService.cancellationPreview(reference);
      return response.data;
    },
    enabled,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reference,
      body,
      csrf,
    }: {
      reference: string;
      body: Parameters<typeof manageService.cancel>[1];
      csrf: string;
    }) => {
      const response = await manageService.cancel(reference, body, csrf);
      return response.data;
    },
    onSuccess: (booking) =>
      queryClient.setQueryData(
        queryKeys.guest.manage(booking.reference),
        booking,
      ),
  });
}

export function useChangeQuote() {
  return useMutation({
    mutationFn: async ({
      reference,
      body,
      csrf,
    }: {
      reference: string;
      body: ChangeQuoteRequest;
      csrf: string;
    }): Promise<ChangeQuoteResponse> => {
      const response = await manageService.changeQuote(reference, body, csrf);
      return response.data;
    },
  });
}

export function useChangeDates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reference,
      body,
      csrf,
    }: {
      reference: string;
      body: { idempotencyKey: string; quoteId: string };
      csrf: string;
    }) => {
      const response = await manageService.changeDates(reference, body, csrf);
      return response.data;
    },
    onSuccess: (result) =>
      queryClient.setQueryData(
        queryKeys.guest.manage(result.view.reference),
        result.view,
      ),
  });
}

export function useSaveDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reference,
      body,
      csrf,
    }: {
      reference: string;
      body: DetailsRequest;
      csrf: string;
    }) => {
      const response = await manageService.saveDetails(reference, body, csrf);
      return response.data;
    },
    onSuccess: (booking) =>
      queryClient.setQueryData(
        queryKeys.guest.manage(booking.reference),
        booking,
      ),
  });
}

export function useManageSignOut() {
  return useMutation({
    mutationFn: async ({
      reference,
      csrf,
    }: {
      reference: string;
      csrf: string;
    }) => {
      const response = await manageService.signOut(reference, csrf);
      return response.data;
    },
  });
}

export function useInitChangePayment() {
  return useMutation({
    mutationFn: async ({
      reference,
      body,
      csrf,
    }: {
      reference: string;
      body: {
        changeId: string;
        method: 'online' | 'bank_transfer';
        idempotencyKey: string;
      };
      csrf: string;
    }) => {
      const response = await manageService.initChangePayment(
        reference,
        body,
        csrf,
      );
      return response.data;
    },
  });
}

export function useUploadChangeProof() {
  return useMutation({
    mutationFn: async ({
      reference,
      changeId,
      file,
      csrf,
    }: {
      reference: string;
      changeId: string;
      file: File;
      csrf: string;
    }) => manageService.uploadChangeProof(reference, changeId, file, csrf),
  });
}
