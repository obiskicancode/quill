'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useInviteStaff } from '@/hooks/services/admin/use-staff';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { StaffInviteInputSchema } from '@/schemas/staff.schema';

const ROLE_OPTIONS = [
  { value: 'reception', label: 'Reception' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner (Full Privileges)' },
];

type InviteInput = z.input<typeof StaffInviteInputSchema>;
type InviteOutput = z.output<typeof StaffInviteInputSchema>;

export function InviteStaffDialog({
  isOpen,
  onClose,
  onSuccess,
  onRequestStepUp,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRequestStepUp: (onVerified: () => void) => void;
}) {
  const inviteStaff = useInviteStaff();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<InviteInput, unknown, InviteOutput>({
    resolver: zodResolver(StaffInviteInputSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'reception',
      phone: '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError: setFieldError,
  } = form;

  if (!isOpen) return null;

  const busy = isSubmitting || inviteStaff.isPending;

  const executeInvite = async (input: InviteOutput) => {
    try {
      setError(null);
      const res = await inviteStaff.mutateAsync(input);
      if (res.success) {
        onSuccess(res.message || SUCCESS_MESSAGES.INVITATION_SENT);
        onClose();
      } else {
        setError(res.message || ERROR_MESSAGES.FAILED_TO_SEND_INVITATION);
      }
    } catch (caught: unknown) {
      if (caught instanceof ServiceError) {
        if (caught.body?.code === ERROR_CODES.STEP_UP_REQUIRED) {
          onRequestStepUp(() => executeInvite(input));
          return;
        }
        setError(caught.message || ERROR_MESSAGES.FAILED_TO_SEND_INVITATION);
        applyServerFieldErrors(setFieldError, caught);
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : ERROR_MESSAGES.FAILED_TO_SEND_INVITATION,
        );
      }
    }
  };

  const handleFormSubmit = async (input: InviteOutput) => {
    setError(null);
    if (input.role === 'owner') {
      onRequestStepUp(() => executeInvite(input));
    } else {
      await executeInvite(input);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" aria-hidden />
            <DialogTitle>Invite Staff Member</DialogTitle>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogBody className="space-y-4">
            <DialogDescription>
              The invited staff member will receive a secure 72-hour single-use
              link to set their password and enrol in 2FA.
            </DialogDescription>

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="invite-first-name"
                label="First Name"
                error={errors.firstName?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('firstName')}
                    type="text"
                    required
                    placeholder="Ada"
                    className={inputClass(errors.firstName?.message)}
                  />
                )}
              </Field>
              <Field
                id="invite-last-name"
                label="Last Name"
                error={errors.lastName?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('lastName')}
                    type="text"
                    required
                    placeholder="Okafor"
                    className={inputClass(errors.lastName?.message)}
                  />
                )}
              </Field>
            </div>

            <Field
              id="invite-email"
              label="Email Address"
              error={errors.email?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register('email')}
                  type="email"
                  required
                  placeholder="staff@quillapartments.com"
                  className={inputClass(errors.email?.message)}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field id="invite-role" label="Role" error={errors.role?.message}>
                {(a11y) => (
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        items={ROLE_OPTIONS}
                        value={field.value}
                        onValueChange={(val) => {
                          if (val) field.onChange(val);
                        }}
                      >
                        <SelectTrigger
                          id={a11y.id}
                          aria-describedby={a11y['aria-describedby']}
                          aria-invalid={a11y['aria-invalid']}
                          onBlur={field.onBlur}
                          className={inputClass(errors.role?.message)}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field
                id="invite-phone"
                label="Phone Number (Optional)"
                error={errors.phone?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('phone')}
                    type="tel"
                    placeholder="+234..."
                    className={inputClass(errors.phone?.message)}
                  />
                )}
              </Field>
            </div>

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
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
