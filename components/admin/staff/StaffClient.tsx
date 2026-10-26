'use client';

import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import type {
  StaffDetailResponse,
  StaffListItem,
  StaffQueryParams,
} from '@/types/staff-admin.types';

import { InviteStaffDialog } from './InviteStaffDialog';
import { StaffDetailSheet } from './StaffDetailSheet';
import { StepUpDialog } from './StepUpDialog';

export function StaffClient() {
  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [filters, setFilters] = useState<StaffQueryParams>({
    role: 'all',
    status: 'all',
    q: '',
  });

  const [selectedStaff, setSelectedStaff] =
    useState<StaffDetailResponse | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Step-up authentication coordinator
  const [stepUpState, setStepUpState] = useState<{
    isOpen: boolean;
    onVerified: () => void;
  }>({
    isOpen: false,
    onVerified: () => {},
  });

  const loadStaff = useCallback(() => {
    setLoading(true);
    adminService
      .listStaff(filters)
      .then((res) => {
        if (res.data) setStaffList(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Failed to load staff members.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    let active = true;
    adminService
      .listStaff(filters)
      .then((res) => {
        if (!active) return;
        if (res.data) setStaffList(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error ? err.message : 'Failed to load staff members.';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const handleRowClick = async (staffItem: StaffListItem) => {
    try {
      const res = await adminService.getStaffDetail(staffItem.id);
      if (res.data) {
        setSelectedStaff(res.data);
      } else {
        setSelectedStaff({
          ...staffItem,
          invitedByName: null,
          deactivatedByName: null,
          activeSessions: [],
          recentAudits: [],
        });
      }
    } catch {
      setSelectedStaff({
        ...staffItem,
        invitedByName: null,
        deactivatedByName: null,
        activeSessions: [],
        recentAudits: [],
      });
    }
  };

  const handleTriggerStepUp = (onVerified: () => void) => {
    setStepUpState({
      isOpen: true,
      onVerified: () => {
        setStepUpState({ isOpen: false, onVerified: () => {} });
        onVerified();
      },
    });
  };

  return (
    <div className="space-y-4">
      {banner && (
        <div className="border-success/30 bg-success/5 text-caption text-success flex items-center justify-between rounded-md border p-3 font-medium">
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-muted hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative max-w-sm min-w-[220px] flex-1">
            <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search by name or email..."
              value={filters.q || ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="focus:border-primary focus:ring-primary border-line bg-surface text-small text-ink placeholder:text-muted w-full rounded-md border py-1.5 pr-3 pl-9 focus:ring-1 focus:outline-none"
            />
          </div>

          <select
            value={filters.role}
            onChange={(e) =>
              setFilters({
                ...filters,
                role: e.target.value as StaffQueryParams['role'],
              })
            }
            className="focus:border-primary border-line bg-surface text-caption text-ink rounded-md border px-3 py-1.5 capitalize focus:outline-none"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="reception">Reception</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as StaffQueryParams['status'],
              })
            }
            className="focus:border-primary border-line bg-surface text-caption text-ink rounded-md border px-3 py-1.5 capitalize focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="deactivated">Deactivated</option>
            <option value="locked">Locked</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="bg-primary text-primary-ink text-small inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 font-semibold shadow-sm hover:opacity-95"
        >
          <UserPlus className="size-4" />
          Invite Staff Member
        </button>
      </div>

      {/* Table view */}
      {loading ? (
        <AdminLoading label="Loading staff directory..." />
      ) : error ? (
        <AdminError
          message={error}
          action={
            <button onClick={loadStaff} className="btn-secondary">
              Retry
            </button>
          }
        />
      ) : staffList.length === 0 ? (
        <AdminEmpty title="No staff members found">
          Adjust your filters or invite your first team member.
        </AdminEmpty>
      ) : (
        <div className="rounded-card border-line bg-surface overflow-x-auto border">
          <table className="text-small w-full text-left">
            <caption className="sr-only">Staff directory</caption>
            <thead className="border-line bg-paper text-caption text-muted border-b font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Two-Factor (2FA)</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {staffList.map((staff) => (
                <tr
                  key={staff.id}
                  onClick={() => handleRowClick(staff)}
                  className="hover:bg-paper/70 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-ink font-semibold">
                      {staff.fullName}
                    </div>
                    <div className="text-caption text-muted">{staff.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="border-line bg-paper text-caption text-ink rounded border px-2 py-0.5 font-medium capitalize">
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
                        staff.status === 'active'
                          ? 'border-success/20 bg-success/10 text-success'
                          : staff.status === 'invited'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                            : staff.status === 'locked'
                              ? 'border-danger/20 bg-danger/10 text-danger'
                              : 'border-muted/20 bg-muted/10 text-muted'
                      }`}
                    >
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {staff.mfaEnabled ? (
                      <span className="text-success inline-flex items-center gap-1 text-[11px] font-medium">
                        <ShieldCheck className="size-3.5" /> Enrolled
                      </span>
                    ) : (
                      <span className="text-muted text-[11px]">Disabled</span>
                    )}
                  </td>
                  <td className="text-caption text-muted px-4 py-3">
                    {staff.lastLoginAt
                      ? new Date(staff.lastLoginAt).toLocaleString('en-GB')
                      : 'Never'}
                  </td>
                  <td className="text-caption text-muted px-4 py-3">
                    {new Date(staff.createdAt).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Detail Sheet */}
      {selectedStaff && (
        <StaffDetailSheet
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onReload={async () => {
            await loadStaff();
            const refreshed = await adminService.getStaffDetail(
              selectedStaff.id,
            );
            if (refreshed.data) setSelectedStaff(refreshed.data);
          }}
          onRequestStepUp={handleTriggerStepUp}
        />
      )}

      {/* Invite Staff Dialog */}
      <InviteStaffDialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={(msg) => {
          setBanner(msg);
          loadStaff();
        }}
        onRequestStepUp={handleTriggerStepUp}
      />

      {/* Step-Up Authentication Dialog */}
      <StepUpDialog
        isOpen={stepUpState.isOpen}
        onClose={() => setStepUpState({ isOpen: false, onVerified: () => {} })}
        onSuccess={stepUpState.onVerified}
      />
    </div>
  );
}
