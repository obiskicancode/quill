'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type { AdminProfileInput } from '@/schemas/admin-account.schema';
import type {
  AdminConfirm2faInput,
  AdminDisable2faInput,
  AdminPasswordChangeInput,
} from '@/schemas/admin-auth.schema';
import type { AdminSession } from '@/types/admin.types';

export function useAdminSessions() {
  return useQuery({
    queryKey: queryKeys.admin.account.sessions(),
    queryFn: async (): Promise<AdminSession[]> => {
      const response = await adminService.getSessions();
      return response.data.sessions;
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.revokeSession(id);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.account.sessions(),
      }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await adminService.revokeOtherSessions();
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.account.sessions(),
      }),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (input: AdminProfileInput) => {
      const response = await adminService.updateProfile(input);
      return response.data;
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminPasswordChangeInput) => {
      const response = await adminService.changePassword(input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.account.sessions(),
      }),
  });
}

export function useSetup2fa() {
  return useMutation({
    mutationFn: async () => {
      const response = await adminService.setup2fa();
      return response.data;
    },
  });
}

export function useConfirm2fa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminConfirm2faInput) => {
      const response = await adminService.confirm2fa(input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.account.sessions(),
      }),
  });
}

export function useDisable2fa() {
  return useMutation({
    mutationFn: async (input: AdminDisable2faInput) => {
      const response = await adminService.disable2fa(input);
      return response.data;
    },
  });
}

export function useRotateRecoveryCodes() {
  return useMutation({
    mutationFn: async (input: AdminDisable2faInput) => {
      const response = await adminService.rotateRecoveryCodes(input);
      return response.data;
    },
  });
}
