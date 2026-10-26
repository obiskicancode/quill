'use client';

import Link from 'next/link';
import {
  ExternalLink,
  History,
  KeyRound,
  LogOut,
  Mail,
  ShieldAlert,
  Smartphone,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { AdminRole } from '@/lib/auth/permissions';
import type {
  StaffDetailResponse,
  StaffUpdateInput,
} from '@/types/staff-admin.types';

const ROLE_OPTIONS = [
  { value: 'reception', label: 'Reception' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
];

export function StaffDetailSheet({
  staff,
  onClose,
  onReload,
  onRequestStepUp,
}: {
  staff: StaffDetailResponse | null;
  onClose: () => void;
  onReload: () => Promise<void>;
  onRequestStepUp: (onVerified: () => void) => void;
}) {
  const [form, setForm] = useState<StaffUpdateInput>(() => ({
    firstName: staff?.firstName || '',
    lastName: staff?.lastName || '',
    phone: staff?.phone || '',
    role: staff?.role || 'reception',
    version: staff?.updatedAt || '0',
  }));

  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  if (!staff) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const isRoleChange = form.role !== staff.role;

    const performSave = async () => {
      try {
        setSaving(true);
        setMessage(null);
        const res = await adminService.updateStaff(staff.id, form);
        if (res.data?.success) {
          setMessage({ text: 'Staff profile updated successfully.' });
          await onReload();
        } else {
          setMessage({
            text: res.data?.message || 'Failed to update',
            isError: true,
          });
        }
      } catch (err: unknown) {
        const errorObj = err as {
          response?: { data?: { data?: { code?: string }; message?: string } };
          message?: string;
        };
        if (errorObj?.response?.data?.data?.code === 'STEP_UP_REQUIRED') {
          onRequestStepUp(() => performSave());
          return;
        }
        setMessage({
          text:
            errorObj?.response?.data?.message ||
            errorObj?.message ||
            'Failed to update',
          isError: true,
        });
      } finally {
        setSaving(false);
      }
    };

    if (isRoleChange) {
      onRequestStepUp(() => performSave());
    } else {
      await performSave();
    }
  };

  const handleAction = async (
    actionName: string,
    actionFn: () => Promise<{ data?: { success?: boolean; message?: string } }>,
    needsStepUp = false,
  ) => {
    const execute = async () => {
      try {
        setActionLoading(actionName);
        setMessage(null);
        const res = await actionFn();
        if (res.data?.success) {
          setMessage({
            text: res.data.message || 'Action completed successfully.',
          });
          await onReload();
        } else {
          setMessage({
            text: res.data?.message || 'Action failed',
            isError: true,
          });
        }
      } catch (err: unknown) {
        const errorObj = err as {
          response?: { data?: { data?: { code?: string }; message?: string } };
          message?: string;
        };
        if (errorObj?.response?.data?.data?.code === 'STEP_UP_REQUIRED') {
          onRequestStepUp(() => execute());
          return;
        }
        setMessage({
          text:
            errorObj?.response?.data?.message ||
            errorObj?.message ||
            'Action failed',
          isError: true,
        });
      } finally {
        setActionLoading(null);
      }
    };

    if (needsStepUp) {
      onRequestStepUp(() => execute());
    } else {
      await execute();
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton
        className="border-line bg-card w-full max-w-2xl gap-0 border-l p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-line flex-row items-center gap-3 border-b px-6 py-4 pr-14">
          <div className="bg-primary/10 text-brand-ink flex size-10 items-center justify-center rounded-full font-bold">
            {staff.firstName[0]}
            {staff.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <SheetTitle className="text-h3 font-display text-ink font-semibold">
                {staff.fullName}
              </SheetTitle>
              <Badge
                variant="outline"
                className={`text-caption rounded-full px-2 py-0.5 font-semibold capitalize ${
                  staff.status === 'active'
                    ? 'border-success/20 bg-success/10 text-success'
                    : staff.status === 'invited'
                      ? 'border-primary/20 bg-primary/10 text-brand-ink'
                      : staff.status === 'locked'
                        ? 'border-destructive/20 bg-destructive/10 text-destructive'
                        : 'border-muted/20 bg-muted/10 text-muted-foreground'
                }`}
              >
                {staff.status}
              </Badge>
            </div>
            <SheetDescription className="text-caption text-muted-foreground">
              {staff.email}
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {message && (
            <div
              className={`text-caption rounded-lg border p-3 font-medium ${
                message.isError
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-success/30 bg-success/5 text-success'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Edit Form */}
          <form
            onSubmit={handleSaveProfile}
            className="border-line bg-paper/30 space-y-4 rounded-lg border p-4"
          >
            <h3 className="text-ink font-semibold">Account Profile</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-first-name">First Name</Label>
                <Input
                  id="staff-first-name"
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-last-name">Last Name</Label>
                <Input
                  id="staff-last-name"
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-role">Role</Label>
                <Select
                  items={ROLE_OPTIONS}
                  value={form.role}
                  onValueChange={(val) => {
                    if (val) setForm({ ...form, role: val as AdminRole });
                  }}
                >
                  <SelectTrigger id="staff-role" className="w-full">
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
                <p className="text-muted-foreground text-[11px]">
                  Role changes require step-up authentication & immediately
                  revoke active sessions.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-phone">Phone Number</Label>
                <Input
                  id="staff-phone"
                  type="tel"
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>

          {/* Quick Security Actions */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <h3 className="text-ink font-semibold">
              Administrative & Security Actions
            </h3>
            <div className="text-caption grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Resend invite (invited accounts only) */}
              {staff.status === 'invited' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction('resend', () =>
                      adminService.resendStaffInvite(staff.id),
                    )
                  }
                  loading={actionLoading === 'resend'}
                  className="h-auto justify-start py-2"
                >
                  <Mail className="text-primary size-4" />
                  <span>Resend Invitation Email</span>
                </Button>
              )}

              {/* Unlock if locked */}
              {staff.status === 'locked' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction('unlock', () =>
                      adminService.unlockStaff(staff.id),
                    )
                  }
                  loading={actionLoading === 'unlock'}
                  className="h-auto justify-start py-2"
                >
                  <UserCheck className="text-success size-4" />
                  <span>Unlock Account</span>
                </Button>
              )}

              {/* Password reset email */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAction('reset_pwd', () =>
                    adminService.sendStaffPasswordReset(staff.id),
                  )
                }
                loading={actionLoading === 'reset_pwd'}
                className="h-auto justify-start py-2"
              >
                <KeyRound className="text-muted-foreground size-4" />
                <span>Send Password Reset</span>
              </Button>

              {/* Sign out of all sessions */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAction('revoke_sess', () =>
                    adminService.revokeStaffSessions(staff.id),
                  )
                }
                loading={actionLoading === 'revoke_sess'}
                className="h-auto justify-start py-2"
              >
                <LogOut className="text-warning size-4" />
                <span>Revoke All Sessions</span>
              </Button>

              {/* Reset 2FA (Step-up required) */}
              {staff.mfaEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction(
                      'reset_2fa',
                      () => adminService.resetStaff2FA(staff.id),
                      true,
                    )
                  }
                  loading={actionLoading === 'reset_2fa'}
                  className="h-auto justify-start py-2"
                >
                  <ShieldAlert className="text-destructive size-4" />
                  <span>Reset 2FA (Requires Step-Up)</span>
                </Button>
              )}

              {/* Deactivate / Reactivate (Step-up required for deactivation) */}
              {staff.status !== 'deactivated' ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleAction(
                      'deactivate',
                      () => adminService.deactivateStaff(staff.id),
                      true,
                    )
                  }
                  loading={actionLoading === 'deactivate'}
                  className="h-auto justify-start py-2"
                >
                  <UserX className="size-4" />
                  <span>Deactivate Account</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction('reactivate', () =>
                      adminService.reactivateStaff(staff.id),
                    )
                  }
                  loading={actionLoading === 'reactivate'}
                  className="text-success hover:text-success border-success/30 hover:bg-success/10 h-auto justify-start py-2"
                >
                  <UserCheck className="size-4" />
                  <span>Reactivate Account</span>
                </Button>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <h3 className="text-ink flex items-center gap-1.5 font-semibold">
              <Smartphone className="text-muted-foreground size-4" /> Active
              Sessions
            </h3>
            {staff.activeSessions.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                No active sessions.
              </p>
            ) : (
              <div className="divide-line divide-y">
                {staff.activeSessions.map((s) => (
                  <div
                    key={s.id}
                    className="text-caption flex items-center justify-between py-2"
                  >
                    <div>
                      <div className="text-ink font-medium">
                        {s.deviceLabel}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        IP: {s.ipAddress || 'unknown'} • Created:{' '}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      {s.lastSeenAt
                        ? `Active ${new Date(s.lastSeenAt).toLocaleTimeString()}`
                        : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Entries */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-ink flex items-center gap-1.5 font-semibold">
                <History className="text-muted-foreground size-4" /> Recent
                Audit Entries (20)
              </h3>
              <Link
                href={`/admin/audit?q=${encodeURIComponent(staff.email)}`}
                className="text-caption text-primary flex items-center gap-1 font-semibold hover:underline"
              >
                Full Audit Log <ExternalLink className="size-3" />
              </Link>
            </div>
            {staff.recentAudits.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                No recent audit events recorded for this user.
              </p>
            ) : (
              <div className="divide-line divide-y">
                {staff.recentAudits.map((a) => (
                  <div key={a.id} className="text-caption space-y-0.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-ink font-mono font-medium capitalize">
                        {a.action} ({a.entity})
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {new Date(a.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {a.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-line bg-paper flex justify-end border-t p-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
