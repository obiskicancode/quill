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
  X,
} from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import type { AdminRole } from '@/lib/auth/permissions';
import type {
  StaffDetailResponse,
  StaffUpdateInput,
} from '@/types/staff-admin.types';

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-surface border-line relative flex h-full w-full max-w-2xl flex-col border-l shadow-2xl">
        {/* Header */}
        <div className="border-line flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full font-bold">
              {staff.firstName[0]}
              {staff.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h3 font-display text-ink font-semibold">
                  {staff.fullName}
                </h2>
                <span
                  className={`text-caption inline-flex items-center rounded-full border px-2 py-0.5 font-semibold capitalize ${
                    staff.status === 'active'
                      ? 'bg-success/10 text-success border-success/20'
                      : staff.status === 'invited'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                        : staff.status === 'locked'
                          ? 'bg-danger/10 text-danger border-danger/20'
                          : 'bg-muted/10 text-muted border-muted/20'
                  }`}
                >
                  {staff.status}
                </span>
              </div>
              <p className="text-caption text-muted">{staff.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:bg-paper hover:text-ink rounded-full p-2"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {message && (
            <div
              className={`text-caption rounded-lg border p-3 font-medium ${
                message.isError
                  ? 'border-danger/30 bg-danger/5 text-danger'
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
              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className="border-line bg-surface text-ink w-full rounded-md border p-2"
                />
              </div>
              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className="border-line bg-surface text-ink w-full rounded-md border p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as AdminRole })
                  }
                  className="border-line bg-surface text-ink w-full rounded-md border p-2 capitalize"
                >
                  <option value="reception">Reception</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
                <p className="text-muted mt-1 text-[11px]">
                  Role changes require step-up authentication & immediately
                  revoke active sessions.
                </p>
              </div>
              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-line bg-surface text-ink w-full rounded-md border p-2"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-caption text-primary-ink rounded-md px-4 py-1.5 font-semibold hover:opacity-95"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
                <button
                  type="button"
                  onClick={() =>
                    handleAction('resend', () =>
                      adminService.resendStaffInvite(staff.id),
                    )
                  }
                  disabled={actionLoading === 'resend'}
                  className="border-line bg-surface text-ink hover:bg-paper inline-flex items-center gap-1.5 rounded-md border p-2"
                >
                  <Mail className="text-primary size-4" />
                  <span>Resend Invitation Email</span>
                </button>
              )}

              {/* Unlock if locked */}
              {staff.status === 'locked' && (
                <button
                  type="button"
                  onClick={() =>
                    handleAction('unlock', () =>
                      adminService.unlockStaff(staff.id),
                    )
                  }
                  disabled={actionLoading === 'unlock'}
                  className="border-line bg-surface text-ink hover:bg-paper inline-flex items-center gap-1.5 rounded-md border p-2"
                >
                  <UserCheck className="text-success size-4" />
                  <span>Unlock Account</span>
                </button>
              )}

              {/* Password reset email */}
              <button
                type="button"
                onClick={() =>
                  handleAction('reset_pwd', () =>
                    adminService.sendStaffPasswordReset(staff.id),
                  )
                }
                disabled={actionLoading === 'reset_pwd'}
                className="border-line bg-surface text-ink hover:bg-paper inline-flex items-center gap-1.5 rounded-md border p-2"
              >
                <KeyRound className="text-muted size-4" />
                <span>Send Password Reset</span>
              </button>

              {/* Sign out of all sessions */}
              <button
                type="button"
                onClick={() =>
                  handleAction('revoke_sess', () =>
                    adminService.revokeStaffSessions(staff.id),
                  )
                }
                disabled={actionLoading === 'revoke_sess'}
                className="border-line bg-surface text-ink hover:bg-paper inline-flex items-center gap-1.5 rounded-md border p-2"
              >
                <LogOut className="text-warning size-4" />
                <span>Revoke All Sessions</span>
              </button>

              {/* Reset 2FA (Step-up required) */}
              {staff.mfaEnabled && (
                <button
                  type="button"
                  onClick={() =>
                    handleAction(
                      'reset_2fa',
                      () => adminService.resetStaff2FA(staff.id),
                      true,
                    )
                  }
                  disabled={actionLoading === 'reset_2fa'}
                  className="border-line bg-surface text-ink hover:bg-paper inline-flex items-center gap-1.5 rounded-md border p-2"
                >
                  <ShieldAlert className="text-danger size-4" />
                  <span>Reset 2FA (Requires Step-Up)</span>
                </button>
              )}

              {/* Deactivate / Reactivate (Step-up required for deactivation) */}
              {staff.status !== 'deactivated' ? (
                <button
                  type="button"
                  onClick={() =>
                    handleAction(
                      'deactivate',
                      () => adminService.deactivateStaff(staff.id),
                      true,
                    )
                  }
                  disabled={actionLoading === 'deactivate'}
                  className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 inline-flex items-center gap-1.5 rounded-md border p-2"
                >
                  <UserX className="size-4" />
                  <span>Deactivate Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    handleAction('reactivate', () =>
                      adminService.reactivateStaff(staff.id),
                    )
                  }
                  disabled={actionLoading === 'reactivate'}
                  className="border-success/30 bg-success/5 text-success hover:bg-success/10 inline-flex items-center gap-1.5 rounded-md border p-2"
                >
                  <UserCheck className="size-4" />
                  <span>Reactivate Account</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <h3 className="text-ink flex items-center gap-1.5 font-semibold">
              <Smartphone className="text-muted size-4" /> Active Sessions
            </h3>
            {staff.activeSessions.length === 0 ? (
              <p className="text-caption text-muted">No active sessions.</p>
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
                      <div className="text-muted text-[11px]">
                        IP: {s.ipAddress || 'unknown'} • Created:{' '}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-muted text-[11px]">
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
                <History className="text-muted size-4" /> Recent Audit Entries
                (20)
              </h3>
              <Link
                href={`/admin/audit?q=${encodeURIComponent(staff.email)}`}
                className="text-caption text-primary flex items-center gap-1 font-semibold hover:underline"
              >
                Full Audit Log <ExternalLink className="size-3" />
              </Link>
            </div>
            {staff.recentAudits.length === 0 ? (
              <p className="text-caption text-muted">
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
                      <span className="text-muted text-[11px]">
                        {new Date(a.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <div className="text-muted text-[11px]">{a.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-line bg-paper flex justify-end border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="border-line bg-surface text-small text-ink hover:bg-paper rounded-md border px-4 py-2 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
