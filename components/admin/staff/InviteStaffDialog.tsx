'use client';

import { UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminRole } from '@/lib/auth/permissions';
import type { StaffInviteInput } from '@/types/staff-admin.types';

const ROLE_OPTIONS = [
  { value: 'reception', label: 'Reception' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner (Full Privileges)' },
];

export function InviteStaffDialog({
  isOpen,
  onClose,
  onSuccess,
  onRequestStepUp,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRequestStepUp: (onVerified: () => void) => void;
}) {
  const [form, setForm] = useState<StaffInviteInput>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'reception',
    phone: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const executeInvite = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await adminService.inviteStaff(form);
      if (res.data?.success) {
        onSuccess(res.data.message || 'Invitation sent successfully');
        onClose();
      } else {
        setError(res.data?.message || 'Failed to send invitation');
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { data?: { code?: string }; message?: string } };
        message?: string;
      };
      if (errorObj?.response?.data?.data?.code === 'STEP_UP_REQUIRED') {
        onRequestStepUp(() => executeInvite());
        return;
      }
      setError(
        errorObj?.response?.data?.message ||
          errorObj?.message ||
          'Failed to send invitation',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.role === 'owner') {
      onRequestStepUp(() => executeInvite());
    } else {
      await executeInvite();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="rounded-card border-line bg-card max-w-lg gap-0 border p-0 shadow-xl sm:max-w-lg">
        <DialogHeader className="border-line border-b p-6 pr-14 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="text-primary size-5" aria-hidden />
            <DialogTitle className="font-display text-h3 text-ink font-semibold">
              Invite Staff Member
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="text-small space-y-4 p-6">
          <DialogDescription className="text-caption text-muted-foreground">
            The invited staff member will receive a secure 72-hour single-use
            link to set their password and enrol in 2FA.
          </DialogDescription>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-first-name">First Name</Label>
              <Input
                id="invite-first-name"
                type="text"
                required
                placeholder="Ada"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-last-name">Last Name</Label>
              <Input
                id="invite-last-name"
                type="text"
                required
                placeholder="Okafor"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="staff@hoteldela.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                items={ROLE_OPTIONS}
                value={form.role}
                onValueChange={(val) => {
                  if (val) setForm({ ...form, role: val as AdminRole });
                }}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-phone">Phone Number (Optional)</Label>
              <Input
                id="invite-phone"
                type="tel"
                placeholder="+234..."
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
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
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
