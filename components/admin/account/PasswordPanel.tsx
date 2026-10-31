'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useChangePassword } from '@/hooks/services/admin/use-account';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from '@/schemas/auth.schema';

type PasswordOutput = z.output<typeof passwordChangeSchema>;

export function PasswordPanel() {
  const changePassword = useChangePassword();
  const form = useForm<PasswordChangeInput, unknown, PasswordOutput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    register,
    reset,
    setError: setFieldError,
  } = form;
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = isSubmitting || changePassword.isPending;

  const onSubmit = async (input: PasswordOutput) => {
    setError(null);
    try {
      const result = await changePassword.mutateAsync(input);
      reset();
      toast.add({
        title: SUCCESS_MESSAGES.PASSWORD_CHANGED(result.revokedSessions),
        type: 'success',
      });
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        applyServerFieldErrors(setFieldError, caught);
      } else {
        setError(ERROR_MESSAGES.COULD_NOT_CHANGE_PASSWORD);
      }
    }
  };

  return (
    <AdminCard
      title="Password"
      description="Use at least 10 characters. Changing it signs out your other devices."
    >
      <div className="space-y-3">
        {error && <StatusBanner tone="error">{error}</StatusBanner>}
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-4 max-w-xl space-y-4"
        noValidate
      >
        <Field
          id="admin-current-password"
          label="Current password"
          error={errors.currentPassword?.message}
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('currentPassword')}
              type="password"
              autoComplete="current-password"
              disabled={busy}
              className={inputClass(errors.currentPassword?.message)}
            />
          )}
        </Field>

        <Field
          id="admin-new-password"
          label="New password"
          hint="At least 10 characters. Avoid a password used elsewhere."
          error={errors.newPassword?.message}
        >
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={busy}
                className={`${inputClass(errors.newPassword?.message)} pr-12`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNew((value) => !value)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 h-full w-12"
              >
                {showNew ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </Button>
            </div>
          )}
        </Field>

        <Field
          id="admin-confirm-password"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('confirmPassword')}
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={busy}
              className={inputClass(errors.confirmPassword?.message)}
            />
          )}
        </Field>

        <Button
          type="submit"
          loading={busy}
          icon={<KeyRound className="size-4" aria-hidden />}
        >
          Change password
        </Button>
      </form>
    </AdminCard>
  );
}
