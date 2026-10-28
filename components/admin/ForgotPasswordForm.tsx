'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useAdminForgotPassword } from '@/hooks/services/admin/use-auth';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  adminForgotPasswordSchema,
  type AdminForgotPasswordInput,
} from '@/schemas/admin-auth.schema';

type ForgotPasswordOutput = z.output<typeof adminForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const forgotPassword = useAdminForgotPassword();
  const form = useForm<AdminForgotPasswordInput, unknown, ForgotPasswordOutput>(
    {
      resolver: zodResolver(adminForgotPasswordSchema),
      defaultValues: { email: '' },
      mode: 'onBlur',
    },
  );
  const {
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = isSubmitting || forgotPassword.isPending;

  const onSubmit = async (input: ForgotPasswordOutput) => {
    setError(null);
    try {
      await forgotPassword.mutateAsync(input);
      setSent(true);
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        applyServerFieldErrors(setFieldError, caught);
      } else {
        setError(ERROR_MESSAGES.COULD_NOT_SEND_REQUEST);
      }
    }
  };

  return (
    <div>
      <p className="text-caption text-muted-foreground font-semibold tracking-wide uppercase">
        Account recovery
      </p>
      <h1 className="font-display text-h2 mt-2">Forgot password</h1>
      <p className="text-small text-muted-foreground mt-2">
        Enter your staff email. If it belongs to an active account, a reset link
        is prepared.
      </p>

      {sent ? (
        <div className="mt-5 space-y-4">
          <StatusBanner tone="success">
            {SUCCESS_MESSAGES.ADMIN_RESET_SENT_EXPIRY}
          </StatusBanner>
          <p className="text-small text-muted-foreground">
            Reset email delivery is not connected in this environment. Ask the
            owner or manager to check the server log for the link.
          </p>
          <Link
            href="/admin/login"
            className="text-small decoration-line hover:decoration-ink inline-block font-semibold underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mt-4">
              <StatusBanner tone="error">{error}</StatusBanner>
            </div>
          )}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-5 space-y-4"
            noValidate
          >
            <Field
              id="admin-forgot-email"
              label="Email address"
              error={errors.email?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  disabled={busy}
                  className={inputClass(errors.email?.message)}
                />
              )}
            </Field>
            <Button
              type="submit"
              loading={busy}
              icon={<Mail className="size-5" aria-hidden />}
              className="w-full"
            >
              Send reset link
            </Button>
          </form>
          <Link
            href="/admin/login"
            className="text-small decoration-line hover:decoration-ink mt-4 inline-block font-semibold underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
