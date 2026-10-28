'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useAdminVerify2fa } from '@/hooks/services/admin/use-auth';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  adminVerify2faSchema,
  type AdminVerify2faInput,
} from '@/schemas/admin-auth.schema';

type Mode = 'totp' | 'recovery';
type VerifyOutput = z.output<typeof adminVerify2faSchema>;

export function VerifyForm({ next }: { next?: string }) {
  const router = useRouter();
  const verify2fa = useAdminVerify2fa();
  const form = useForm<AdminVerify2faInput, unknown, VerifyOutput>({
    resolver: zodResolver(adminVerify2faSchema),
    defaultValues: { code: '', mode: 'totp' },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    setError: setFieldError,
    setValue,
    watch,
  } = form;
  const mode = watch('mode') as Mode;
  const [error, setError] = useState<string | null>(null);
  const busy = isSubmitting || verify2fa.isPending;

  const onSubmit = async (input: VerifyOutput) => {
    setError(null);
    try {
      const result = await verify2fa.mutateAsync(input);
      const target =
        next?.startsWith('/admin') && !next.startsWith('//')
          ? next
          : (result.redirectTo ?? '/admin');
      router.push(target);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        applyServerFieldErrors(setFieldError, caught);
      } else {
        setError(ERROR_MESSAGES.COULD_NOT_VERIFY_CODE);
      }
    }
  };

  return (
    <div>
      <p className="text-caption text-muted-foreground font-semibold tracking-wide uppercase">
        Two-factor authentication
      </p>
      <h1 className="font-display text-h2 mt-2">Enter your code</h1>
      <p className="text-small text-muted-foreground mt-2">
        {mode === 'totp'
          ? 'Open your authenticator app and enter the current six-digit code.'
          : 'Enter one of the recovery codes you saved when you set up two-factor authentication.'}
      </p>

      <Tabs
        value={mode}
        onValueChange={(value) => {
          setValue('mode', value as Mode);
          setValue('code', '');
          setError(null);
          form.clearErrors('code');
        }}
        className="mt-5 w-full"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 p-1">
          <TabsTrigger value="totp" className="gap-2">
            <ShieldCheck className="size-4" aria-hidden />
            Authenticator
          </TabsTrigger>
          <TabsTrigger value="recovery" className="gap-2">
            <KeyRound className="size-4" aria-hidden />
            Recovery code
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
          id="admin-mfa-code"
          label={mode === 'totp' ? 'Six-digit code' : 'Recovery code'}
          hint={
            mode === 'totp'
              ? 'Codes change every 30 seconds.'
              : 'Recovery codes can only be used once.'
          }
          error={errors.code?.message}
        >
          {(a11y) => (
            <Controller
              control={control}
              name="code"
              render={({ field }) =>
                mode === 'totp' ? (
                  <div className="flex justify-center py-2">
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={(value) =>
                        field.onChange(value.replace(/\D/g, ''))
                      }
                      onBlur={field.onBlur}
                      autoFocus
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot
                          index={0}
                          className="rounded-control text-h3 size-12"
                        />
                        <InputOTPSlot
                          index={1}
                          className="rounded-control text-h3 size-12"
                        />
                        <InputOTPSlot
                          index={2}
                          className="rounded-control text-h3 size-12"
                        />
                        <InputOTPSlot
                          index={3}
                          className="rounded-control text-h3 size-12"
                        />
                        <InputOTPSlot
                          index={4}
                          className="rounded-control text-h3 size-12"
                        />
                        <InputOTPSlot
                          index={5}
                          className="rounded-control text-h3 size-12"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                ) : (
                  <Input
                    {...a11y}
                    {...field}
                    type="text"
                    onChange={(event) =>
                      field.onChange(event.target.value.toUpperCase())
                    }
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={11}
                    disabled={busy}
                    className={`${inputClass(errors.code?.message)} tracking-wider uppercase`}
                  />
                )
              }
            />
          )}
        </Field>

        <Button type="submit" loading={busy} className="w-full">
          Verify and continue
        </Button>
      </form>

      <div className="text-small mt-4 flex items-center justify-between">
        <Link
          href="/admin/login"
          className="decoration-line hover:decoration-ink font-semibold underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
