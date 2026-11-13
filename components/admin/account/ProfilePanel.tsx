'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
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
import { useUpdateProfile } from '@/hooks/services/admin/use-account';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  profileSchema,
  type AdminProfileInput,
} from '@/schemas/account.schema';
import type { Staff } from '@/types/staff.types';

type ProfileOutput = z.output<typeof profileSchema>;

/** Editable staff profile: name and phone, with server field errors applied. */
export function ProfilePanel({ staff }: { staff: Staff }) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const form = useForm<AdminProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone ?? '',
    },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    register,
    reset,
    setError: setFieldError,
  } = form;
  const [error, setError] = useState<string | null>(null);
  const busy = isSubmitting || updateProfile.isPending;

  const onSubmit = async (input: ProfileOutput) => {
    setError(null);
    try {
      const result = await updateProfile.mutateAsync(input);
      reset({
        firstName: result.staff.firstName,
        lastName: result.staff.lastName,
        phone: result.staff.phone ?? '',
      });
      toast.add({ title: SUCCESS_MESSAGES.PROFILE_UPDATED, type: 'success' });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        applyServerFieldErrors(setFieldError, caught);
      } else {
        setError(ERROR_MESSAGES.COULD_NOT_SAVE_PROFILE);
      }
    }
  };

  return (
    <AdminCard
      title="Profile"
      description="This name appears in the admin bar and audit log."
    >
      <div className="space-y-3">
        {error && <StatusBanner tone="error">{error}</StatusBanner>}
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-4 space-y-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="admin-first-name"
            label="First name"
            error={errors.firstName?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...register('firstName')}
                autoComplete="given-name"
                disabled={busy}
                className={inputClass(errors.firstName?.message)}
              />
            )}
          </Field>
          <Field
            id="admin-last-name"
            label="Last name"
            error={errors.lastName?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...register('lastName')}
                autoComplete="family-name"
                disabled={busy}
                className={inputClass(errors.lastName?.message)}
              />
            )}
          </Field>
        </div>

        <Field
          id="admin-phone"
          label="Phone"
          optional
          error={errors.phone?.message}
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register('phone')}
              type="tel"
              autoComplete="tel"
              disabled={busy}
              className={inputClass(errors.phone?.message)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-small font-semibold">Email address</p>
            <p className="mt-1 rounded-control border border-line bg-paper px-3 py-2.5 text-small text-muted-foreground">
              {staff.email}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              Ask an owner to change your sign-in email.
            </p>
          </div>
          <div>
            <p className="text-small font-semibold">Role</p>
            <p className="mt-1 rounded-control border border-line bg-paper px-3 py-2.5 text-small text-muted-foreground capitalize">
              {staff.role}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              Roles are managed by an owner.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          loading={busy}
          icon={<Save className="size-4" aria-hidden />}
        >
          Save profile
        </Button>
      </form>
    </AdminCard>
  );
}
