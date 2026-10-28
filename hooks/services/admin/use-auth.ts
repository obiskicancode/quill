'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import type {
  AdminForgotPasswordInput,
  AdminLoginInput,
  AdminResetPasswordInput,
  AdminVerify2faInput,
} from '@/schemas/admin-auth.schema';

export function useAdminLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminLoginInput) => {
      const response = await adminService.login(input);
      return response.data;
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useAdminVerify2fa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminVerify2faInput) => {
      const response = await adminService.verify2fa(input);
      return response.data;
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useAdminForgotPassword() {
  return useMutation({
    mutationFn: async (input: AdminForgotPasswordInput) => {
      const response = await adminService.forgotPassword(input);
      return response.data;
    },
  });
}

export function useAdminResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminResetPasswordInput) => {
      const response = await adminService.resetPassword(input);
      return response.data;
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.logout(),
    onSettled: () => queryClient.clear(),
  });
}
