'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useAdminLogin } from '@/hooks/services/admin/use-auth';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  adminLoginSchema,
  type AdminLoginInput,
} from '@/schemas/admin-auth.schema';

type AdminLoginOutput = z.output<typeof adminLoginSchema>;

export function LoginForm({
  next,
  expired = false,
  reset = false,
}: {
  next?: string;
  expired?: boolean;
  reset?: boolean;
}) {
  const router = useRouter();
  const login = useAdminLogin();
  const form = useForm<AdminLoginInput, unknown, AdminLoginOutput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '', next },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const busy = isSubmitting || login.isPending;

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const onSubmit = async (input: AdminLoginOutput) => {
    if (lockSeconds > 0) return;
    setError(null);
    try {
      const result = await login.mutateAsync(input);
      if (result.mfaRequired) {
        const params = new URLSearchParams();
        if (next) params.set('next', next);
        router.push(
          `/admin/login/verify${params.size ? `?${params.toString()}` : ''}`,
        );
        return;
      }
      router.push(result.redirectTo ?? '/admin');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        applyServerFieldErrors(setFieldError, caught);
        if (typeof caught.body?.retryAfterSeconds === 'number') {
          setLockSeconds(caught.body.retryAfterSeconds);
        }
      } else {
        setError(ERROR_MESSAGES.COULD_NOT_SIGN_IN);
      }
    }
  };

  return (
    <div>
      <p className="text-caption text-muted-foreground font-semibold tracking-wide uppercase">
        Staff access
      </p>
      <h1 className="font-display text-h2 mt-2">Sign in</h1>
      <p className="text-small text-muted-foreground mt-2">
        Use your work email and password. Owners will be asked for an
        authenticator code.
      </p>

      <div className="mt-6 space-y-3">
        {expired && (
          <StatusBanner tone="info">
            Your session ended. Sign in again to continue.
          </StatusBanner>
        )}
        {reset && (
          <StatusBanner tone="success">
            Password updated. Sign in with your new password.
          </StatusBanner>
        )}
        {error && (
          <StatusBanner tone="error">
            {error}
            {lockSeconds > 0 && (
              <span className="mt-1 block font-semibold">
                Try again in {formatCountdown(lockSeconds)}.
              </span>
            )}
          </StatusBanner>
        )}
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-5 space-y-4"
        noValidate
      >
        <Field
          id="admin-email"
          label="Email address"
          error={errors.email?.message}
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('email')}
              type="email"
              autoComplete="username"
              autoFocus
              disabled={busy}
              className={inputClass(errors.email?.message)}
            />
          )}
        </Field>

        <Field
          id="admin-password"
          label="Password"
          error={errors.password?.message}
        >
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

        <Button
          type="submit"
          loading={busy}
          disabled={lockSeconds > 0}
          icon={<LogIn className="size-5" aria-hidden />}
          className="w-full"
        >
          {lockSeconds > 0
            ? `Locked for ${formatCountdown(lockSeconds)}`
            : 'Sign in'}
        </Button>
      </form>

      <div className="text-small mt-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/forgot-password"
          className="decoration-line hover:decoration-ink font-semibold underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
