'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type {
  ManualRefundPayoutInput,
  PaymentDetailResponse,
  PaymentsQueryParams,
  ReconcileBulkInput,
} from '@/types/payments-admin.types';

function toQueryString(
  params: Record<string, string | number | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export function usePayments(params: PaymentsQueryParams) {
  return useQuery({
    queryKey: queryKeys.admin.payments.list(toQueryString(params)),
    queryFn: async () => (await adminService.listPayments(params)).data,
    placeholderData: keepPreviousData,
  });
}

export function usePaymentsSummary() {
  return useQuery({
    queryKey: queryKeys.admin.payments.summary(''),
    queryFn: async () => (await adminService.getPaymentsSummary()).data,
  });
}

export function usePaymentDetail(
  id: string | null,
  options?: { initialData?: PaymentDetailResponse },
) {
  return useQuery({
    queryKey: queryKeys.admin.payments.detail(id ?? ''),
    queryFn: async () => (await adminService.getPaymentDetail(id!)).data,
    enabled: Boolean(id),
    initialData: options?.initialData,
  });
}

export function useManualRefunds() {
  return useQuery({
    queryKey: queryKeys.admin.payments.refunds(''),
    queryFn: async () => (await adminService.listManualRefunds()).data,
  });
}

export function useWebhookEvents(
  params: Record<string, string | number | undefined> = {},
) {
  return useQuery({
    queryKey: queryKeys.admin.payments.webhooks(toQueryString(params)),
    queryFn: async () => (await adminService.listWebhookEvents(params)).data,
  });
}

export function useReconcilePayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReconcileBulkInput) =>
      (await adminService.reconcilePaymentsBulk(input)).data,
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.summary(''),
        }),
        ...input.paymentIds.map((id) =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.admin.payments.detail(id),
          }),
        ),
      ]);
    },
  });
}

export function useUnreconcilePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) =>
      (await adminService.unreconcilePayment(input.id, input.reason)).data,
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.summary(''),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.detail(input.id),
        }),
      ]);
    },
  });
}

export function useMarkManualRefundPaidOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; body: ManualRefundPayoutInput }) =>
      (await adminService.markManualRefundPaidOut(input.id, input.body)).data,
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.refunds(''),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.summary(''),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.detail(input.id),
        }),
      ]);
    },
  });
}

export function useRecheckRefundStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await adminService.recheckRefundStatus(id)).data,
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.refunds(''),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.detail(id),
        }),
      ]);
    },
  });
}

export function useReprocessWebhookEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await adminService.reprocessWebhookEvent(id)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.webhooks(''),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.payments.refunds(''),
        }),
      ]);
    },
  });
}
