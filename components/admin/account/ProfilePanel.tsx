'use client';

import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/Button';
import type { AdminStaff } from '@/types/admin.types';

export function ProfilePanel({ staff }: { staff: AdminStaff }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(staff.firstName);
  const [lastName, setLastName] = useState(staff.lastName);
  const [phone, setPhone] = useState(staff.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});
    try {
      const result = await adminService.updateProfile({
        firstName,
        lastName,
        phone,
      });
      setFirstName(result.data.staff.firstName);
      setLastName(result.data.staff.lastName);
      setPhone(result.data.staff.phone ?? '');
      setSaved(true);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        setFieldErrors(caught.body?.fieldErrors ?? {});
      } else {
        setError('Could not save your profile. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminCard
      title="Profile"
      description="This name appears in the admin bar and audit log."
    >
      <div className="space-y-3">
        {error && <StatusBanner tone="error">{error}</StatusBanner>}
        {saved && <StatusBanner tone="success">Profile updated.</StatusBanner>}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="admin-first-name"
            label="First name"
            error={fieldErrors.firstName}
          >
            {(a11y) => (
              <input
                {...a11y}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
                className={inputClass(fieldErrors.firstName)}
              />
            )}
          </Field>
          <Field
            id="admin-last-name"
            label="Last name"
            error={fieldErrors.lastName}
          >
            {(a11y) => (
              <input
                {...a11y}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
                className={inputClass(fieldErrors.lastName)}
              />
            )}
          </Field>
        </div>

        <Field
          id="admin-phone"
          label="Phone"
          optional
          error={fieldErrors.phone}
        >
          {(a11y) => (
            <input
              {...a11y}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              className={inputClass(fieldErrors.phone)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-small font-semibold">Email address</p>
            <p className="rounded-control border-line bg-paper text-small text-muted mt-1 border px-3 py-2.5">
              {staff.email}
            </p>
            <p className="text-caption text-muted mt-1">
              Ask an owner to change your sign-in email.
            </p>
          </div>
          <div>
            <p className="text-small font-semibold">Role</p>
            <p className="rounded-control border-line bg-paper text-small text-muted mt-1 border px-3 py-2.5 capitalize">
              {staff.role}
            </p>
            <p className="text-caption text-muted mt-1">
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
