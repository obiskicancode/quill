'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type {
  AdminApproveDeclineInput,
  AdminCancelInput,
  AdminChangeDatesInput,
  AdminChangeDatesQuoteInput,
  AdminEditDetailsInput,
  AdminNoShowInput,
  AdminReassignRoomInput,
  AdminRecordPaymentInput,
  AdminRefundInput,
  AdminResendConfirmationInput,
  AdminVerifyTransferInput,
  ReservationDetail,
} from '@/types/reservation.types';

export type CancellationPreviewData = Awaited<
  ReturnType<typeof adminService.previewCancellation>
>['data'];

export type ChangeDatesQuoteData = Awaited<
  ReturnType<typeof adminService.quoteChangeDates>
>['data'];

export type AvailableReservationRoomsData = Awaited<
  ReturnType<typeof adminService.getAvailableRooms>
>['data'];

type AvailableRoomsParams = Parameters<
  typeof adminService.getAvailableRooms
>[0];

function updateReservationCaches(
  queryClient: QueryClient,
  id: string,
  updated: ReservationDetail,
) {
  queryClient.setQueryData(queryKeys.admin.reservations.detail(id), updated);
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations.neighbors(id, '').slice(0, 4),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations
      .changeQuote(id, { checkIn: '', checkOut: '' })
      .slice(0, 4),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations.availableRooms('').slice(0, 3),
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
}

function invalidateReservationDetail(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations.detail(id),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.reservations.neighbors(id, '').slice(0, 4),
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
}

export function useCancellationPreview(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.reservations.cancellationPreview(id),
    queryFn: async (): Promise<CancellationPreviewData> => {
      const response = await adminService.previewCancellation(id);
      return response.data;
    },
    enabled,
    staleTime: 0,
  });
}

export function useChangeDatesQuote(
  id: string,
  input: AdminChangeDatesQuoteInput,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.admin.reservations.changeQuote(id, input),
    queryFn: async (): Promise<ChangeDatesQuoteData> => {
      const response = await adminService.quoteChangeDates(id, input);
      return response.data;
    },
    enabled,
    staleTime: 0,
  });
}

function availableRoomsQueryString(params: AvailableRoomsParams) {
  return new URLSearchParams({
    roomTypeId: params.roomTypeId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    ...(params.excludeReservationId
      ? { excludeReservationId: params.excludeReservationId }
      : {}),
  }).toString();
}

export function useAvailableReservationRooms(
  params: AvailableRoomsParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.admin.reservations.availableRooms(
      availableRoomsQueryString(params),
    ),
    queryFn: async (): Promise<AvailableReservationRoomsData> => {
      const response = await adminService.getAvailableRooms(params);
      return response.data;
    },
    enabled,
    staleTime: 0,
  });
}

export function useApproveDeclineReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminApproveDeclineInput;
    }): Promise<ReservationDetail> => {
      const response =
        body.action === 'approve'
          ? await adminService.approveReservation(id, body)
          : await adminService.declineReservation(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminCancelInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.cancelReservation(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useChangeReservationDates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminChangeDatesInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.changeDates(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useUpdateReservationDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminEditDetailsInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.updateDetails(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useMarkReservationNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminNoShowInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.markNoShow(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useReassignReservationRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminReassignRoomInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.reassignRoom(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useRecordReservationPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminRecordPaymentInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.recordPayment(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useIssueReservationRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminRefundInput;
    }): Promise<ReservationDetail> => {
      const response = await adminService.issueRefund(id, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useVerifyReservationTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentId,
      body,
    }: {
      id: string;
      paymentId: string;
      body: AdminVerifyTransferInput;
    }): Promise<ReservationDetail> => {
      const response =
        body.action === 'verify'
          ? await adminService.verifyTransfer(id, paymentId, body)
          : await adminService.rejectTransfer(id, paymentId, body);
      return response.data;
    },
    onSuccess: (updated) =>
      updateReservationCaches(queryClient, updated.id, updated),
  });
}

export function useResendReservationConfirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: AdminResendConfirmationInput;
    }) => {
      const response = await adminService.resendConfirmation(id, body);
      return response.data;
    },
    onSuccess: (_data, variables) =>
      invalidateReservationDetail(queryClient, variables.id),
  });
}
