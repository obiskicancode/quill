'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ERROR_MESSAGES } from '@/constants/error-messages';

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
          : ERROR_MESSAGES.COULD_NOT_VERIFY_CODE,
      );
    } finally {
      setBusy(false);
    }
  }

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
        onValueChange={(val) => {
          setMode(val as Mode);
          setCode('');
          setError(null);
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
          {(a11y) =>
            mode === 'totp' ? (
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(val) => setCode(val.replace(/\D/g, ''))}
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
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                maxLength={11}
                required
                className={`${inputClass()} tracking-wider uppercase`}
              />
            )
          }
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
