'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useAdminResetPassword } from '@/hooks/services/admin/use-auth';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/schemas/auth.schema';

type ResetPasswordOutput = z.output<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const resetPassword = useAdminResetPassword();
  const form = useForm<ResetPasswordInput, unknown, ResetPasswordOutput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const busy = isSubmitting || resetPassword.isPending;

  const onSubmit = async (input: ResetPasswordOutput) => {
    setError(null);
    setInvalidToken(false);
    try {
      await resetPassword.mutateAsync(input);
      router.push('/admin/login?reset=1');
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        applyServerFieldErrors(setFieldError, caught);
        if (caught.status === 400) setInvalidToken(true);
      } else {
        setError(ERROR_MESSAGES.COULD_NOT_RESET_PASSWORD);
      }
    }
  };

  return (
    <div>
      <p className="text-caption text-muted-foreground font-semibold tracking-wide uppercase">
        Account recovery
      </p>
      <h1 className="font-display text-h2 mt-2">Choose a new password</h1>
      <p className="text-small text-muted-foreground mt-2">
        Use at least 10 characters. All other sessions will be signed out.
      </p>

      {error && (
        <div className="mt-4">
          <StatusBanner tone="error">{error}</StatusBanner>
        </div>
      )}
      {invalidToken && (
        <p className="text-small mt-3">
          <Link
            href="/admin/forgot-password"
            className="decoration-line hover:decoration-ink font-semibold underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        </p>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-5 space-y-4"
        noValidate
      >
        <Field
          id="admin-reset-password"
          label="New password"
          hint="At least 10 characters. Avoid common or repeated passwords."
          error={errors.password?.message}
        >
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                disabled={busy}
                className={`${inputClass(errors.password?.message)} pr-12`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 h-full w-12"
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </Button>
            </div>
          )}
        </Field>

        <Field
          id="admin-reset-confirm"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={busy}
              className={inputClass(errors.confirmPassword?.message)}
            />
          )}
        </Field>

        <Button
          type="submit"
          loading={busy}
          disabled={invalidToken}
          icon={<KeyRound className="size-5" aria-hidden />}
          className="w-full"
        >
          Set new password
        </Button>
      </form>
    </div>
  );
}
