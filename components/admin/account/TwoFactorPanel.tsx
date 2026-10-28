'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Download, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { FlowDialog } from '@/components/manage/FlowDialog';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useConfirm2fa,
  useDisable2fa,
  useRotateRecoveryCodes,
  useSetup2fa,
} from '@/hooks/services/admin/use-account';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  adminConfirm2faSchema,
  adminDisable2faSchema,
  type AdminConfirm2faInput,
  type AdminDisable2faInput,
} from '@/schemas/admin-auth.schema';
import type { AdminMfaSetupResponse } from '@/types/admin.types';
import type { AdminRole } from '@/types/auth.types';

type ConfirmOutput = z.output<typeof adminConfirm2faSchema>;
type PasswordOutput = z.output<typeof adminDisable2faSchema>;

export function TwoFactorPanel({
  enabled,
  role,
  pending,
  onEnabledChange,
}: {
  enabled: boolean;
  role: AdminRole;
  pending: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const router = useRouter();
  const setup2fa = useSetup2fa();
  const confirm2fa = useConfirm2fa();
  const disable2fa = useDisable2fa();
  const rotateCodes = useRotateRecoveryCodes();
  const confirmForm = useForm<AdminConfirm2faInput, unknown, ConfirmOutput>({
    resolver: zodResolver(adminConfirm2faSchema),
    defaultValues: { code: '' },
    mode: 'onBlur',
  });
  const passwordForm = useForm<AdminDisable2faInput, unknown, PasswordOutput>({
    resolver: zodResolver(adminDisable2faSchema),
    defaultValues: { password: '' },
    mode: 'onBlur',
  });
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [setup, setSetup] = useState<AdminMfaSetupResponse | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [dialogAction, setDialogAction] = useState<'disable' | 'rotate' | null>(
    null,
  );
  const [dialogError, setDialogError] = useState<string | null>(null);
  const setupBusy = setup2fa.isPending;
  const confirmBusy =
    confirmForm.formState.isSubmitting || confirm2fa.isPending;
  const dialogBusy =
    passwordForm.formState.isSubmitting ||
    disable2fa.isPending ||
    rotateCodes.isPending;

  async function startSetup() {
    setSetupError(null);
    setCopiedKey(false);
    try {
      const result = await setup2fa.mutateAsync();
      setSetup(result);
      setCodes(null);
    } catch (caught) {
      setSetupError(
        caught instanceof ServiceError
          ? caught.message
          : ERROR_MESSAGES.COULD_NOT_START_2FA_SETUP,
      );
    }
  }

  const confirmSetup = async (input: ConfirmOutput) => {
    try {
      const result = await confirm2fa.mutateAsync(input);
      setCodes(result.recoveryCodes);
      setSetup(null);
      confirmForm.reset();
      setIsEnabled(true);
      onEnabledChange(true);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        applyServerFieldErrors(confirmForm.setError, caught);
      }
    }
  };

  async function copyCodes() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        title: ERROR_MESSAGES.COULD_NOT_COPY_CODES,
        type: 'error',
        priority: 'high',
      });
    }
  }

  async function copySetupKey() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.manualKey);
      setCopiedKey(true);
      toast.add({
        title: SUCCESS_MESSAGES.COPIED,
        type: 'success',
      });
      window.setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      toast.add({
        title: ERROR_MESSAGES.COULD_NOT_COPY_SETUP_KEY,
        type: 'error',
        priority: 'high',
      });
    }
  }

  function downloadCodes() {
    if (!codes) return;
    const blob = new Blob(
      [
        'Divine Excellent Apartments admin recovery codes\n',
        'Each code can be used once.\n\n',
        codes.join('\n'),
      ],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'admin-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openDialog(action: 'disable' | 'rotate') {
    setDialogAction(action);
    passwordForm.reset();
    setDialogError(null);
  }

  const completeDialog = async (input: PasswordOutput) => {
    if (!dialogAction) return;
    setDialogError(null);
    try {
      if (dialogAction === 'disable') {
        await disable2fa.mutateAsync(input);
        setIsEnabled(false);
        setCodes(null);
        toast.add({
          title: SUCCESS_MESSAGES.TWO_FACTOR_DISABLED,
          type: 'success',
        });
        onEnabledChange(false);
      } else {
        const result = await rotateCodes.mutateAsync(input);
        setCodes(result.recoveryCodes);
        toast.add({
          title: SUCCESS_MESSAGES.RECOVERY_CODES_ROTATED,
          type: 'success',
        });
      }
      setDialogAction(null);
      passwordForm.reset();
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError) {
        setDialogError(caught.message);
        applyServerFieldErrors(passwordForm.setError, caught);
      } else {
        setDialogError(ERROR_MESSAGES.COULD_NOT_COMPLETE_ACTION);
      }
    }
  };

  if (codes) {
    return (
      <AdminCard
        title="Save your recovery codes"
        description="These codes are shown once. Store them somewhere safe, away from your authenticator."
      >
        <StatusBanner tone="success">
          Two-factor authentication is active. Each recovery code can be used
          once if you lose your authenticator.
        </StatusBanner>
        <ul className="text-small mt-4 grid gap-2 font-mono sm:grid-cols-2">
          {codes.map((code) => (
            <li
              key={code}
              className="rounded-control border-line bg-paper border px-3 py-2 tracking-wider"
            >
              {code}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={copyCodes}
            icon={
              copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )
            }
          >
            {copied ? SUCCESS_MESSAGES.COPIED : 'Copy codes'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadCodes}
            icon={<Download className="size-4" aria-hidden />}
          >
            Download
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCodes(null);
              if (pending) router.push('/admin');
            }}
          >
            I have saved these codes
          </Button>
        </div>
      </AdminCard>
    );
  }

  return (
    <>
      <AdminCard
        title="Two-factor authentication"
        description="Use an authenticator app such as Google Authenticator, 1Password or Authy."
      >
        {setupError && (
          <div className="mb-4">
            <StatusBanner tone="error">{setupError}</StatusBanner>
          </div>
        )}

        {!isEnabled && !setup && (
          <div className="max-w-xl">
            <p className="text-small text-muted-foreground">
              Two-factor authentication adds a one-time code after your
              password. It protects the account even if the password is reused.
            </p>
            <Button
              className="mt-4"
              loading={setupBusy}
              onClick={startSetup}
              icon={<ShieldCheck className="size-5" aria-hidden />}
            >
              Set up two-factor
            </Button>
          </div>
        )}

        {setup && (
          <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
            <div>
              <Image
                src={setup.qrCodeDataUrl}
                alt="QR code for authenticator setup"
                width={240}
                height={240}
                unoptimized
                className="rounded-control border-line border bg-white p-2"
              />
            </div>
            <div>
              <ol className="text-small text-muted-foreground list-decimal space-y-2 pl-5">
                <li>Open your authenticator app and scan the QR code.</li>
                <li>
                  If you cannot scan it, enter this key manually:
                  <div className="rounded-control border-line bg-paper mt-1 flex w-fit items-center gap-2 border px-3 py-2">
                    <code className="text-small text-ink min-w-0 flex-1 font-mono break-all select-all">
                      {setup.manualKey}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={copySetupKey}
                      aria-label={
                        copiedKey ? 'Setup key copied' : 'Copy setup key'
                      }
                      title={copiedKey ? 'Copied' : 'Copy setup key'}
                      className="shrink-0"
                    >
                      {copiedKey ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                </li>
                <li>Enter the six-digit code your app shows.</li>
              </ol>

              <form
                onSubmit={confirmForm.handleSubmit(confirmSetup)}
                className="mt-4 flex flex-col gap-3"
                noValidate
              >
                <div className="min-w-0">
                  <Field
                    id="admin-setup-code"
                    label="Six-digit code"
                    error={confirmForm.formState.errors.code?.message}
                  >
                    {(a11y) => (
                      <Controller
                        control={confirmForm.control}
                        name="code"
                        render={({ field }) => (
                          <InputOTP
                            {...a11y}
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={(value) =>
                              field.onChange(value.replace(/\D/g, ''))
                            }
                            onBlur={field.onBlur}
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            disabled={confirmBusy}
                          >
                            <InputOTPGroup className="gap-1.5">
                              {Array.from({ length: 6 }).map((_, index) => (
                                <InputOTPSlot
                                  key={index}
                                  index={index}
                                  className="rounded-control text-h3 size-10"
                                />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        )}
                      />
                    )}
                  </Field>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSetup(null);
                      setCopiedKey(false);
                      confirmForm.reset();
                    }}
                    className="mt-3 font-semibold"
                  >
                    Cancel setup
                  </Button>
                  <Button type="submit" loading={confirmBusy}>
                    Confirm and enable
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="max-w-xl">
            <StatusBanner tone="success">
              Two-factor authentication is enabled.
            </StatusBanner>
            <p className="text-small text-muted-foreground mt-3">
              Recovery codes are the only backup if you lose your authenticator.
              Rotate them if you think they were exposed.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openDialog('rotate')}
                icon={<KeyRound className="size-4" aria-hidden />}
              >
                New recovery codes
              </Button>
              {role !== 'owner' ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => openDialog('disable')}
                >
                  Disable two-factor
                </Button>
              ) : (
                <p className="text-caption text-muted-foreground">
                  Owners cannot disable two-factor authentication.
                </p>
              )}
            </div>
          </div>
        )}
      </AdminCard>

      <FlowDialog
        open={dialogAction !== null}
        onClose={() => {
          if (!dialogBusy) setDialogAction(null);
        }}
        title={
          dialogAction === 'disable'
            ? 'Disable two-factor'
            : 'Generate new recovery codes'
        }
        dismissible={!dialogBusy}
      >
        <p className="text-small text-muted-foreground">
          {dialogAction === 'disable'
            ? 'Enter your current password to turn off two-factor authentication.'
            : 'Enter your current password. Every old recovery code will stop working.'}
        </p>
        {dialogError && (
          <div className="mt-3">
            <StatusBanner tone="error">{dialogError}</StatusBanner>
          </div>
        )}
        <form
          onSubmit={passwordForm.handleSubmit(completeDialog)}
          className="mt-4 space-y-4"
          noValidate
        >
          <Field
            id="admin-2fa-password"
            label="Current password"
            error={passwordForm.formState.errors.password?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                {...passwordForm.register('password')}
                type="password"
                autoComplete="current-password"
                autoFocus
                disabled={dialogBusy}
                className={inputClass(
                  passwordForm.formState.errors.password?.message,
                )}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              loading={dialogBusy}
              variant={dialogAction === 'disable' ? 'danger' : 'primary'}
            >
              {dialogAction === 'disable'
                ? 'Disable two-factor'
                : 'Generate codes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={dialogBusy}
              onClick={() => setDialogAction(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </FlowDialog>
    </>
  );
}
