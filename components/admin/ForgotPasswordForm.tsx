'use client';

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
import { TextLink } from '@/components/ui/text-link';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useAdminForgotPassword } from '@/hooks/services/admin/use-auth';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/schemas/auth.schema';

type ForgotPasswordOutput = z.output<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
  resetLinkInServerLog = false,
}: {
  /** True when this deployment logs reset links instead of emailing them. */
  resetLinkInServerLog?: boolean;
}) {
  const forgotPassword = useAdminForgotPassword();
  const form = useForm<ForgotPasswordInput, unknown, ForgotPasswordOutput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });
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
      <p className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
        Account recovery
      </p>
      <h1 className="mt-2 font-display text-h2">Forgot password</h1>
      <p className="mt-2 text-small text-muted-foreground">
        Enter your staff email. If it belongs to an active account, a reset link
        is prepared.
      </p>

      {sent ? (
        <div className="mt-5 space-y-4">
          <StatusBanner tone="success">
            {SUCCESS_MESSAGES.ADMIN_RESET_SENT_EXPIRY}
          </StatusBanner>
          {resetLinkInServerLog && (
            <p className="text-small text-muted-foreground">
              This deployment has no email provider connected, so the link was
              written to the server log instead of being sent.
            </p>
          )}
          <TextLink href="/admin/login" tone="quiet" className="text-small">
            Back to sign in
          </TextLink>
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
          <TextLink
            href="/admin/login"
            tone="quiet"
            className="mt-4 text-small"
          >
            Back to sign in
          </TextLink>
        </>
      )}
    </div>
  );
}
