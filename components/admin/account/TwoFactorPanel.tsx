'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Field, inputClass } from '@/components/checkout/Field';
import { FlowDialog } from '@/components/manage/FlowDialog';
import { Button } from '@/components/ui/Button';
import type { AdminRole } from '@/lib/auth/permissions';
import type { AdminMfaSetupResponse } from '@/types/admin.types';

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
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [setup, setSetup] = useState<AdminMfaSetupResponse | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogAction, setDialogAction] = useState<'disable' | 'rotate' | null>(
    null,
  );
  const [password, setPassword] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function startSetup() {
    setSetupBusy(true);
    setSetupError(null);
    setNotice(null);
    try {
      const result = await adminService.setup2fa();
      setSetup(result.data);
      setCodes(null);
    } catch (caught) {
      setSetupError(
        caught instanceof ServiceError
          ? caught.message
          : 'Could not start setup. Try again.',
      );
    } finally {
      setSetupBusy(false);
    }
  }

  async function confirmSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      const result = await adminService.confirm2fa({ code: confirmCode });
      setCodes(result.data.recoveryCodes);
      setSetup(null);
      setConfirmCode('');
      setIsEnabled(true);
      onEnabledChange(true);
      router.refresh();
    } catch (caught) {
      setConfirmError(
        caught instanceof ServiceError
          ? caught.message
          : 'Could not confirm the code. Try again.',
      );
    } finally {
      setConfirmBusy(false);
    }
  }

  async function copyCodes() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('Could not copy automatically. Save each code manually.');
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
    setPassword('');
    setDialogError(null);
  }

  async function completeDialog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogAction) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialogAction === 'disable') {
        await adminService.disable2fa({ password });
        setIsEnabled(false);
        setCodes(null);
        setNotice('Two-factor authentication is now disabled.');
        onEnabledChange(false);
      } else {
        const result = await adminService.rotateRecoveryCodes({ password });
        setCodes(result.data.recoveryCodes);
        setNotice(
          'New recovery codes generated. The old codes no longer work.',
        );
      }
      setDialogAction(null);
      setPassword('');
      router.refresh();
    } catch (caught) {
      setDialogError(
        caught instanceof ServiceError
          ? caught.message
          : 'Could not complete that action. Try again.',
      );
    } finally {
      setDialogBusy(false);
    }
  }

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
        <ul className="mt-4 grid gap-2 font-mono text-small sm:grid-cols-2">
          {codes.map((code) => (
            <li
              key={code}
              className="rounded-control border border-line bg-paper px-3 py-2 tracking-wider"
            >
              {code}
            </li>
          ))}
        </ul>
        {notice && (
          <div className="mt-3">
            <StatusBanner tone="info">{notice}</StatusBanner>
          </div>
        )}
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
            {copied ? 'Copied' : 'Copy codes'}
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
              setNotice(null);
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
        {pending && (
          <div className="mb-4">
            <StatusBanner tone="error">
              Owners must set up two-factor authentication before opening the
              dashboard.
            </StatusBanner>
          </div>
        )}
        {notice && (
          <div className="mb-4">
            <StatusBanner tone="success">{notice}</StatusBanner>
          </div>
        )}
        {setupError && (
          <div className="mb-4">
            <StatusBanner tone="error">{setupError}</StatusBanner>
          </div>
        )}

        {!isEnabled && !setup && (
          <div className="max-w-xl">
            <p className="text-small text-muted">
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
                className="rounded-control border border-line bg-white p-2"
              />
            </div>
            <div>
              <ol className="list-decimal space-y-2 pl-5 text-small text-muted">
                <li>Open your authenticator app and scan the QR code.</li>
                <li>
                  If you cannot scan it, enter this key manually:
                  <code className="mt-1 block select-all break-all rounded-control border border-line bg-paper px-3 py-2 font-mono text-small text-ink">
                    {setup.manualKey}
                  </code>
                </li>
                <li>Enter the six-digit code your app shows.</li>
              </ol>

              {confirmError && (
                <div className="mt-3">
                  <StatusBanner tone="error">{confirmError}</StatusBanner>
                </div>
              )}

              <form
                onSubmit={confirmSetup}
                className="mt-4 flex flex-wrap items-end gap-3"
                noValidate
              >
                <div className="w-40">
                  <Field id="admin-setup-code" label="Six-digit code">
                    {(a11y) => (
                      <input
                        {...a11y}
                        value={confirmCode}
                        onChange={(event) =>
                          setConfirmCode(
                            event.target.value.replace(/\D/g, '').slice(0, 6),
                          )
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        className={`${inputClass()} text-center text-h3 tracking-[0.3em]`}
                      />
                    )}
                  </Field>
                </div>
                <Button type="submit" loading={confirmBusy}>
                  Confirm and enable
                </Button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setSetup(null);
                  setConfirmError(null);
                  setConfirmCode('');
                }}
                className="mt-3 text-small font-semibold underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                Cancel setup
              </button>
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="max-w-xl">
            <StatusBanner tone="success">
              Two-factor authentication is enabled.
            </StatusBanner>
            <p className="mt-3 text-small text-muted">
              Recovery codes are the only backup if you lose your authenticator.
              Rotate them if you think they were exposed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
                <p className="text-caption text-muted">
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
        <p className="text-small text-muted">
          {dialogAction === 'disable'
            ? 'Enter your current password to turn off two-factor authentication.'
            : 'Enter your current password. Every old recovery code will stop working.'}
        </p>
        {dialogError && (
          <div className="mt-3">
            <StatusBanner tone="error">{dialogError}</StatusBanner>
          </div>
        )}
        <form onSubmit={completeDialog} className="mt-4 space-y-4">
          <Field id="admin-2fa-password" label="Current password">
            {(a11y) => (
              <input
                {...a11y}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
                className={inputClass()}
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
