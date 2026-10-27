'use client';

import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ERROR_MESSAGES } from '@/constants/error-messages';

export function StepUpDialog({
  isOpen,
  title = ERROR_MESSAGES.SECURITY_VERIFICATION_REQUIRED,
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

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!password && !totpCode) {
      setError(ERROR_MESSAGES.STEP_UP_PROMPT);
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
        setError(ERROR_MESSAGES.VERIFICATION_FAILED_CREDENTIALS);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : ERROR_MESSAGES.VERIFICATION_FAILED;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="rounded-card border-line bg-card max-w-md gap-0 border p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-line border-b p-6 pr-14 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-primary size-5" aria-hidden />
            <DialogTitle className="font-display text-h3 text-ink font-semibold">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="text-small space-y-4 p-6">
          <DialogDescription className="text-caption text-muted-foreground">
            {description}
          </DialogDescription>

          <div className="space-y-1.5">
            <Label htmlFor="stepup-password">Admin Password</Label>
            <Input
              id="stepup-password"
              type="password"
              placeholder="Enter your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="text-caption text-muted-foreground text-center">
            — OR —
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stepup-totp">
              6-digit Authenticator Code (2FA)
            </Label>
            <Input
              id="stepup-totp"
              type="text"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono tracking-widest"
            />
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-destructive/30 bg-destructive/5 text-caption text-destructive"
            >
              {error}
            </Alert>
          )}

          <DialogFooter className="border-line border-t bg-transparent px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting}>
              Verify & Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
