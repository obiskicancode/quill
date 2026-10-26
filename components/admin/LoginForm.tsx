'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm({
  next,
  expired = false,
  reset = false,
}: {
  next?: string;
  expired?: boolean;
  reset?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || lockSeconds > 0) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = (await adminService.login({ email, password, next })).data;
      if (result.mfaRequired) {
        const params = new URLSearchParams();
        if (next) params.set('next', next);
        router.push(
          `/admin/login/verify${params.size ? `?${params.toString()}` : ''}`,
        );
        return;
      }
      router.push(result.redirectTo ?? '/admin');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setError(caught.message);
        setFieldErrors(caught.body?.fieldErrors ?? {});
        if (typeof caught.body?.retryAfterSeconds === 'number') {
          setLockSeconds(caught.body.retryAfterSeconds);
        }
      } else {
        setError('Could not sign in. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-caption text-muted-foreground font-semibold tracking-wide uppercase">
        Staff access
      </p>
      <h1 className="font-display text-h2 mt-2">Sign in</h1>
      <p className="text-small text-muted-foreground mt-2">
        Use your work email and password. Owners will be asked for an
        authenticator code.
      </p>

      <div className="mt-6 space-y-3">
        {expired && (
          <StatusBanner tone="info">
            Your session ended. Sign in again to continue.
          </StatusBanner>
        )}
        {reset && (
          <StatusBanner tone="success">
            Password updated. Sign in with your new password.
          </StatusBanner>
        )}
        {error && (
          <StatusBanner tone="error">
            {error}
            {lockSeconds > 0 && (
              <span className="mt-1 block font-semibold">
                Try again in {formatCountdown(lockSeconds)}.
              </span>
            )}
          </StatusBanner>
        )}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field id="admin-email" label="Email address" error={fieldErrors.email}>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              autoFocus
              required
              className={inputClass(fieldErrors.email)}
            />
          )}
        </Field>

        <Field
          id="admin-password"
          label="Password"
          error={fieldErrors.password}
        >
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className={`${inputClass(fieldErrors.password)} pr-12`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 h-full w-12"
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </Button>
            </div>
          )}
        </Field>

        <Button
          type="submit"
          loading={busy}
          disabled={lockSeconds > 0}
          icon={<LogIn className="size-5" aria-hidden />}
          className="w-full"
        >
          {lockSeconds > 0
            ? `Locked for ${formatCountdown(lockSeconds)}`
            : 'Sign in'}
        </Button>
      </form>

      <div className="text-small mt-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/forgot-password"
          className="decoration-line hover:decoration-ink font-semibold underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
