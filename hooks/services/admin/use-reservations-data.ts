'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type { CreateReservationInput } from '@/schemas/reservation.schema';
import type { CheckoutQuoteResponse } from '@/types/checkout.types';
import type {
  ReservationDetail,
  ReservationNeighbors,
  ReservationsListResponse,
} from '@/types/reservation.types';

export interface AvailableRoomsInput {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  excludeReservationId?: string;
}

export interface ReservationQuoteInput {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  extraBed?: boolean;
  extras?: { id: string; quantity: number }[];
  discount?: { type: 'fixed' | 'percentage'; value: number };
}

function availableRoomsKey(input: AvailableRoomsInput): string {
  const params = new URLSearchParams({
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });
  if (input.excludeReservationId) {
    params.set('excludeReservationId', input.excludeReservationId);
  }
  return params.toString();
}

function quoteKey(input: ReservationQuoteInput): string {
  return JSON.stringify({
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
    children: input.children,
    extraBed: input.extraBed ?? false,
    extras: [...(input.extras ?? [])]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((extra) => [extra.id, extra.quantity]),
    discount: input.discount
      ? { type: input.discount.type, value: input.discount.value }
      : null,
  });
}

export function useReservationsList(
  queryString: string,
  initialData?: ReservationsListResponse,
) {
  return useQuery({
    queryKey: queryKeys.admin.reservations.list(queryString),
    queryFn: async () => {
      const response = await adminService.getReservationsList(queryString);
      return response.data;
    },
    initialData,
    staleTime: 0,
  });
}

export function useReservationDetail(
  id: string,
  initialData?: ReservationDetail | null,
) {
  return useQuery({
    queryKey: queryKeys.admin.reservations.detail(id),
    queryFn: async () => {
      const response = await adminService.getReservationDetail(id);
      return response.data;
    },
    initialData: initialData ?? undefined,
    staleTime: 0,
    refetchInterval: 45_000,
  });
}

export function useReservationNeighbors(id: string, queryString: string) {
  return useQuery({
    queryKey: queryKeys.admin.reservations.neighbors(id, queryString),
    queryFn: async (): Promise<ReservationNeighbors> => {
      const response = await adminService.getReservationNeighbors(
        id,
        queryString,
      );
      return response.data;
    },
    staleTime: 0,
  });
}

export function useAvailableRooms(input: AvailableRoomsInput | null) {
  const key = input ? availableRoomsKey(input) : '';
  const enabled = Boolean(
    input?.roomTypeId &&
    input.checkIn &&
    input.checkOut &&
    input.checkOut > input.checkIn,
  );

  return useQuery({
    queryKey: queryKeys.admin.reservations.availableRooms(key),
    queryFn: async () => {
      if (!input) {
        throw new Error('A room type and stay dates are required.');
      }
      const response = await adminService.getAvailableRooms({
        roomTypeId: input.roomTypeId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        ...(input.excludeReservationId
          ? { excludeReservationId: input.excludeReservationId }
          : {}),
      });
      return response.data.rooms;
    },
    enabled,
    staleTime: 0,
  });
}

export function useReservationQuote(input: ReservationQuoteInput | null) {
  const key = input ? quoteKey(input) : '';

  return useQuery({
    queryKey: queryKeys.admin.reservations.quote(key),
    queryFn: async (): Promise<CheckoutQuoteResponse> => {
      if (!input) {
        throw new Error('A room type and stay dates are required.');
      }
      const response = await adminService.quoteReservation({
        roomTypeId: input.roomTypeId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        adults: input.adults,
        children: input.children,
        extraBed: input.extraBed,
        extras: input.extras,
        discount: input.discount,
      });
      return response.data;
    },
    enabled: Boolean(input),
    staleTime: 0,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReservationInput) => {
      const response = await adminService.createReservation(input);
      return response.data;
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(
        queryKeys.admin.reservations.detail(detail.id),
        detail,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.reservations.lists(),
      });
    },
  });
}

export function useCheckInReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.checkInReservation(id);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.reservations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.calendar.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.dashboard.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.payments.all,
      });
    },
  });
}

export function useCheckOutReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.checkOutReservation(id);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.reservations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.calendar.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.dashboard.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.payments.all,
      });
    },
  });
}

export function useAuditProofView() {
  return useMutation({
    mutationFn: async ({
      reservationId,
      paymentId,
    }: {
      reservationId: string;
      paymentId?: string;
    }) => {
      const response = await adminService.auditProofView(
        reservationId,
        paymentId,
      );
      return response.data;
    },
  });
}
