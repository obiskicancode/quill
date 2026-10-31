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
  StaffDetailResponse,
  StaffInviteInput,
  StaffQueryParams,
  StaffUpdateInput,
  StepUpAuthInput,
} from '@/types/staff.types';

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

export function useStaffList(params: StaffQueryParams) {
  return useQuery({
    queryKey: queryKeys.admin.staff.list(toQueryString(params)),
    queryFn: async () => (await adminService.listStaff(params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useStaffDetail(
  id: string | null,
  options?: { initialData?: StaffDetailResponse },
) {
  return useQuery({
    queryKey: queryKeys.admin.staff.detail(id ?? ''),
    queryFn: async () => (await adminService.getStaffDetail(id!)).data,
    enabled: Boolean(id),
    initialData: options?.initialData,
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffInviteInput) =>
      (await adminService.inviteStaff(input)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.staff.lists(),
      });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; body: StaffUpdateInput }) =>
      (await adminService.updateStaff(input.id, input.body)).data,
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.staff.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.staff.detail(input.id),
        }),
      ]);
    },
  });
}

function useStaffAction(
  action: (id: string) => Promise<{ success: boolean; message: string }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => action(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.staff.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.staff.detail(id),
        }),
      ]);
    },
  });
}

export function useResendStaffInvite() {
  return useStaffAction(
    async (id) => (await adminService.resendStaffInvite(id)).data,
  );
}

export function useDeactivateStaff() {
  return useStaffAction(
    async (id) => (await adminService.deactivateStaff(id)).data,
  );
}

export function useReactivateStaff() {
  return useStaffAction(
    async (id) => (await adminService.reactivateStaff(id)).data,
  );
}

export function useUnlockStaff() {
  return useStaffAction(
    async (id) => (await adminService.unlockStaff(id)).data,
  );
}

export function useRevokeStaffSessions() {
  return useStaffAction(
    async (id) => (await adminService.revokeStaffSessions(id)).data,
  );
}

export function useResetStaff2FA() {
  return useStaffAction(
    async (id) => (await adminService.resetStaff2FA(id)).data,
  );
}

export function useSendStaffPasswordReset() {
  return useStaffAction(
    async (id) => (await adminService.sendStaffPasswordReset(id)).data,
  );
}

export function useVerifyStepUp() {
  return useMutation({
    mutationFn: async (input: StepUpAuthInput) =>
      (await adminService.stepUpVerify(input)).data,
  });
}
