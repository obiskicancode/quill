'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useVerifyStepUp } from '@/hooks/services/admin/use-staff';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';

const StepUpFormSchema = z.object({
  password: z.string().optional(),
  totpCode: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^\d{6}$/.test(value),
      ERROR_MESSAGES.SIX_DIGIT_CODE_REQUIRED,
    ),
});

type StepUpInput = z.input<typeof StepUpFormSchema>;
type StepUpOutput = z.output<typeof StepUpFormSchema>;

/**
 * Step-up verification dialog for sensitive staff actions, accepting a password
 * or an authenticator code.
 */
export function StepUpDialog({
  isOpen,
  title = ERROR_MESSAGES.SECURITY_VERIFICATION_REQUIRED,
  description = 'This is a sensitive security operation. Please re-enter your password or 2FA code to continue.',
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const verifyStepUp = useVerifyStepUp();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<StepUpInput, unknown, StepUpOutput>({
    resolver: zodResolver(StepUpFormSchema),
    defaultValues: { password: '', totpCode: '' },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError: setFieldError,
  } = form;
  const { onChange: onTotpChange, ...totpField } = register('totpCode');

  if (!isOpen) return null;

  const busy = isSubmitting || verifyStepUp.isPending;
  const handleFormSubmit = async (input: StepUpOutput) => {
    if (!input.password && !input.totpCode) {
      setError(ERROR_MESSAGES.STEP_UP_PROMPT);
      return;
    }

    try {
      setError(null);
      const res = await verifyStepUp.mutateAsync({
        password: input.password || undefined,
        totpCode: input.totpCode || undefined,
      });

      if (res.success) {
        onSuccess();
      } else {
        setError(ERROR_MESSAGES.VERIFICATION_FAILED_CREDENTIALS);
      }
    } catch (caught: unknown) {
      if (caught instanceof ServiceError) {
        setError(caught.message || ERROR_MESSAGES.VERIFICATION_FAILED);
        applyServerFieldErrors(setFieldError, caught);
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : ERROR_MESSAGES.VERIFICATION_FAILED,
        );
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" aria-hidden />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogBody className="space-y-4">
            <DialogDescription>{description}</DialogDescription>

            <Field
              id="stepup-password"
              label="Admin Password"
              error={errors.password?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register('password')}
                  type="password"
                  placeholder="Enter your current password"
                  className={inputClass(errors.password?.message)}
                />
              )}
            </Field>

            <div className="text-center text-caption text-muted-foreground">
              — OR —
            </div>

            <Field
              id="stepup-totp"
              label="6-digit Authenticator Code (2FA)"
              error={errors.totpCode?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  {...totpField}
                  onChange={(event) => {
                    event.target.value = event.target.value.replace(/\D/g, '');
                    void onTotpChange(event);
                  }}
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className={`${inputClass(errors.totpCode?.message)} text-center font-mono tracking-widest`}
                />
              )}
            </Field>

            {error && (
              <Alert variant="destructive" size="sm">
                {error}
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={busy}>
              Verify & Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
