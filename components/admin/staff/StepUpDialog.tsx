'use client';

import { ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';

export function StepUpDialog({
  isOpen,
  title = 'Security Verification Required',
  description = 'This is a sensitive security operation. Please re-enter your password or 2FA code to continue.',
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password && !totpCode) {
      setError('Please enter your password or 6-digit 2FA code.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await adminService.stepUpVerify({
        password: password || undefined,
        totpCode: totpCode || undefined,
      });

      if (res.data?.success) {
        onSuccess();
      } else {
        setError('Verification failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="rounded-card border-line bg-surface w-full max-w-md border p-6 shadow-2xl">
        <div className="border-line flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            <h3 className="font-display text-h3 text-ink font-semibold">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink rounded p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="text-small mt-4 space-y-4">
          <p className="text-muted text-caption">{description}</p>

          <div>
            <label className="text-caption text-ink mb-1 block font-semibold">
              Admin Password
            </label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-line bg-paper text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 focus:outline-none"
            />
          </div>

          <div className="text-caption text-muted text-center">— OR —</div>

          <div>
            <label className="text-caption text-ink mb-1 block font-semibold">
              6-digit Authenticator Code (2FA)
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="border-line bg-paper text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 text-center font-mono tracking-widest focus:outline-none"
            />
          </div>

          {error && (
            <div className="border-danger/30 bg-danger/5 text-caption text-danger rounded border p-2.5">
              {error}
            </div>
          )}

          <div className="border-line flex items-center justify-end gap-2 border-t pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border-line text-small text-ink hover:bg-paper rounded-md border px-4 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-small text-primary-ink rounded-md px-4 py-2 font-semibold hover:opacity-95"
            >
              {submitting ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
