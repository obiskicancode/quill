'use client';

import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    try {
      const result = await adminService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      const revoked = result.data.revokedSessions;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(
        revoked > 0
          ? `Password changed. ${revoked} other ${
              revoked === 1 ? 'session was' : 'sessions were'
            } signed out.`
          : 'Password changed.',
      );
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        setFieldErrors(caught.body?.fieldErrors ?? {});
      } else {
        setError('Could not change your password. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminCard
      title="Password"
      description="Use at least 10 characters. Changing it signs out your other devices."
    >
      <div className="space-y-3">
        {error && <StatusBanner tone="error">{error}</StatusBanner>}
        {success && <StatusBanner tone="success">{success}</StatusBanner>}
      </div>

      <form onSubmit={submit} className="mt-4 max-w-xl space-y-4" noValidate>
        <Field
          id="admin-current-password"
          label="Current password"
          error={fieldErrors.currentPassword}
        >
          {(a11y) => (
            <Input
              {...a11y}
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
              className={inputClass(fieldErrors.currentPassword)}
            />
          )}
        </Field>

        <Field
          id="admin-new-password"
          label="New password"
          hint="At least 10 characters. Avoid a password used elsewhere."
          error={fieldErrors.newPassword}
        >
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                className={`${inputClass(fieldErrors.newPassword)} pr-12`}
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
          error={fieldErrors.confirmPassword}
        >
          {(a11y) => (
            <Input
              {...a11y}
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              className={inputClass(fieldErrors.confirmPassword)}
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
