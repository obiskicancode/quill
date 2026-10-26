'use client';

import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import type { AdminRole } from '@/lib/auth/permissions';
import type { StaffInviteInput } from '@/types/staff-admin.types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="rounded-card border-line bg-surface w-full max-w-lg border p-6 shadow-xl">
        <div className="border-line flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="text-primary size-5" />
            <h3 className="font-display text-h3 text-ink font-semibold">
              Invite Staff Member
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
          <p className="text-caption text-muted">
            The invited staff member will receive a secure 72-hour single-use
            link to set their password and enrol in 2FA.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-caption text-ink mb-1 block font-semibold">
                First Name
              </label>
              <input
                type="text"
                required
                placeholder="Ada"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                className="border-line bg-paper text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-caption text-ink mb-1 block font-semibold">
                Last Name
              </label>
              <input
                type="text"
                required
                placeholder="Okafor"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="border-line bg-paper text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-caption text-ink mb-1 block font-semibold">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="staff@hoteldela.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border-line bg-paper text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-caption text-ink mb-1 block font-semibold">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as AdminRole })
                }
                className="border-line bg-paper text-ink focus:border-primary w-full rounded-md border p-2.5 capitalize focus:outline-none"
              >
                <option value="reception">Reception</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner (Full Privileges)</option>
              </select>
            </div>
            <div>
              <label className="text-caption text-ink mb-1 block font-semibold">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+234..."
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="border-line bg-paper text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 focus:outline-none"
              />
            </div>
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
              {submitting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
