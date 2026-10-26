'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/Button';

type Mode = 'totp' | 'recovery';

export function VerifyForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = (await adminService.verify2fa({ code, mode })).data;
      const target =
        next?.startsWith('/admin') && !next.startsWith('//')
          ? next
          : (result.redirectTo ?? '/admin');
      router.push(target);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ServiceError
          ? caught.message
          : 'Could not verify that code. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-caption text-muted font-semibold tracking-wide uppercase">
        Two-factor authentication
      </p>
      <h1 className="font-display text-h2 mt-2">Enter your code</h1>
      <p className="text-small text-muted mt-2">
        {mode === 'totp'
          ? 'Open your authenticator app and enter the current six-digit code.'
          : 'Enter one of the recovery codes you saved when you set up two-factor authentication.'}
      </p>

      <div
        role="tablist"
        aria-label="Verification method"
        className="rounded-control border-line bg-paper mt-5 grid grid-cols-2 border p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'totp'}
          onClick={() => {
            setMode('totp');
            setCode('');
            setError(null);
          }}
          className={`rounded-control text-small flex min-h-10 items-center justify-center gap-2 font-semibold ${
            mode === 'totp' ? 'bg-surface shadow-raised' : 'text-muted'
          }`}
        >
          <ShieldCheck className="size-4" aria-hidden />
          Authenticator
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'recovery'}
          onClick={() => {
            setMode('recovery');
            setCode('');
            setError(null);
          }}
          className={`rounded-control text-small flex min-h-10 items-center justify-center gap-2 font-semibold ${
            mode === 'recovery' ? 'bg-surface shadow-raised' : 'text-muted'
          }`}
        >
          <KeyRound className="size-4" aria-hidden />
          Recovery code
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <StatusBanner tone="error">{error}</StatusBanner>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field
          id="admin-mfa-code"
          label={mode === 'totp' ? 'Six-digit code' : 'Recovery code'}
          hint={
            mode === 'totp'
              ? 'Codes change every 30 seconds.'
              : 'Recovery codes can only be used once.'
          }
        >
          {(a11y) => (
            <input
              {...a11y}
              type="text"
              value={code}
              onChange={(event) =>
                setCode(
                  mode === 'totp'
                    ? event.target.value.replace(/\D/g, '').slice(0, 6)
                    : event.target.value.toUpperCase(),
                )
              }
              inputMode={mode === 'totp' ? 'numeric' : 'text'}
              autoComplete="one-time-code"
              autoFocus
              maxLength={mode === 'totp' ? 6 : 11}
              required
              className={`${inputClass()} ${
                mode === 'totp'
                  ? 'text-h3 text-center tracking-[0.35em]'
                  : 'tracking-wider uppercase'
              }`}
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
