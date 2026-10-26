'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/Button';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    try {
      await adminService.forgotPassword({ email });
      setSent(true);
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        setFieldError(caught.body?.fieldErrors?.email);
      } else {
        setError('Could not send the request. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-wide text-muted">
        Account recovery
      </p>
      <h1 className="mt-2 font-display text-h2">Forgot password</h1>
      <p className="mt-2 text-small text-muted">
        Enter your staff email. If it belongs to an active account, a reset link
        is prepared.
      </p>

      {sent ? (
        <div className="mt-5 space-y-4">
          <StatusBanner tone="success">
            If that email belongs to a staff account, a reset link has been
            sent. It expires in 60 minutes.
          </StatusBanner>
          <p className="text-small text-muted">
            Reset email delivery is not connected in this environment. Ask the
            owner or manager to check the server log for the link.
          </p>
          <Link
            href="/admin/login"
            className="inline-block text-small font-semibold underline decoration-line underline-offset-4 hover:decoration-ink"
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
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field
              id="admin-forgot-email"
              label="Email address"
              error={fieldError}
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  className={inputClass(fieldError)}
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
            className="mt-4 inline-block text-small font-semibold underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
