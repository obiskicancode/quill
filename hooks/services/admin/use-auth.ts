'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  Verify2faInput,
} from '@/schemas/auth.schema';

export function useAdminLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await adminService.login(input);
      return response.data;
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useAdminVerify2fa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Verify2faInput) => {
      const response = await adminService.verify2fa(input);
      return response.data;
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useAdminForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      const response = await adminService.forgotPassword(input);
      return response.data;
    },
  });
}

export function useAdminResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
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
