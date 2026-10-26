'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/Button';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setInvalidToken(false);
    try {
      await adminService.resetPassword({
        token,
        password,
        confirmPassword,
      });
      router.push('/admin/login?reset=1');
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        setFieldErrors(caught.body?.fieldErrors ?? {});
        if (caught.status === 400) setInvalidToken(true);
      } else {
        setError('Could not reset your password. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-caption text-muted font-semibold tracking-wide uppercase">
        Account recovery
      </p>
      <h1 className="font-display text-h2 mt-2">Choose a new password</h1>
      <p className="text-small text-muted mt-2">
        Use at least 10 characters. All other sessions will be signed out.
      </p>

      {error && (
        <div className="mt-4">
          <StatusBanner tone="error">{error}</StatusBanner>
        </div>
      )}
      {invalidToken && (
        <p className="text-small mt-3">
          <Link
            href="/admin/forgot-password"
            className="decoration-line hover:decoration-ink font-semibold underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        </p>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field
          id="admin-reset-password"
          label="New password"
          hint="At least 10 characters. Avoid common or repeated passwords."
          error={fieldErrors.password}
        >
          {(a11y) => (
            <div className="relative">
              <input
                {...a11y}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus
                required
                className={`${inputClass(fieldErrors.password)} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted hover:text-ink absolute inset-y-0 right-0 grid w-12 place-items-center"
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </button>
            </div>
          )}
        </Field>

        <Field
          id="admin-reset-confirm"
          label="Confirm new password"
          error={fieldErrors.confirmPassword}
        >
          {(a11y) => (
            <input
              {...a11y}
              type={showPassword ? 'text' : 'password'}
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
          disabled={invalidToken}
          icon={<KeyRound className="size-5" aria-hidden />}
          className="w-full"
        >
          Set new password
        </Button>
      </form>
    </div>
  );
}
