'use client';

import { Search, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type {
  StaffDetailResponse,
  StaffListItem,
  StaffQueryParams,
} from '@/types/staff-admin.types';

import { InviteStaffDialog } from './InviteStaffDialog';
import { StaffDetailSheet } from './StaffDetailSheet';
import { StepUpDialog } from './StepUpDialog';

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'reception', label: 'Reception' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'locked', label: 'Locked' },
];

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
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_STAFF_MEMBERS;
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
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_STAFF_MEMBERS;
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBanner(null)}
            className="h-6 px-2 text-xs"
          >
            <X className="mr-1 size-3" />
            Dismiss
          </Button>
        </div>
      )}

      {/* Filter and action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative max-w-sm min-w-55 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={filters.q || ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            items={ROLE_FILTER_OPTIONS}
            value={filters.role}
            onValueChange={(val) => {
              if (val) {
                setFilters({
                  ...filters,
                  role: val as StaffQueryParams['role'],
                });
              }
            }}
          >
            <SelectTrigger aria-label="Filter by staff role" className="w-32.5">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={STATUS_FILTER_OPTIONS}
            value={filters.status}
            onValueChange={(val) => {
              if (val) {
                setFilters({
                  ...filters,
                  status: val as StaffQueryParams['status'],
                });
              }
            }}
          >
            <SelectTrigger aria-label="Filter by staff status" className="w-35">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={() => setInviteOpen(true)}
          icon={<UserPlus className="size-4" />}
        >
          Invite Staff Member
        </Button>
      </div>

      {/* Table view */}
      {loading ? (
        <AdminLoading label="Loading staff directory..." />
      ) : error ? (
        <AdminError
          message={error}
          action={
            <Button variant="secondary" onClick={loadStaff}>
              Retry
            </Button>
          }
        />
      ) : staffList.length === 0 ? (
        <AdminEmpty title="No staff members found">
          Adjust your filters or invite your first team member.
        </AdminEmpty>
      ) : (
        <div className="rounded-card border-line bg-card overflow-hidden border">
          <Table className="text-small w-full text-left">
            <caption className="sr-only">Staff directory</caption>
            <TableHeader className="border-line bg-paper text-caption text-muted-foreground border-b font-semibold uppercase">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground px-4 py-3">
                  Staff Member
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3">
                  Role
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3">
                  Two-Factor (2FA)
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3">
                  Last Login
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-line divide-y">
              {staffList.map((staff) => (
                <TableRow
                  key={staff.id}
                  onClick={() => handleRowClick(staff)}
                  className="hover:bg-paper/70 cursor-pointer transition-colors"
                >
                  <TableCell className="px-4 py-3">
                    <div className="text-ink font-semibold">
                      {staff.fullName}
                    </div>
                    <div className="text-caption text-muted-foreground">
                      {staff.email}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="border-line bg-paper text-caption text-ink rounded border px-2 py-0.5 font-medium capitalize"
                    >
                      {staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-caption rounded-full px-2 py-0.5 font-semibold capitalize ${
                        staff.status === 'active'
                          ? 'border-success/20 bg-success/10 text-success'
                          : staff.status === 'invited'
                            ? 'border-primary/30 bg-primary/15 text-brand-ink'
                            : staff.status === 'locked'
                              ? 'border-destructive/20 bg-destructive/10 text-destructive'
                              : 'border-muted/20 bg-muted/10 text-muted-foreground'
                      }`}
                    >
                      {staff.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {staff.mfaEnabled ? (
                      <span className="text-success text-caption inline-flex items-center gap-1 font-medium">
                        <ShieldCheck className="size-3.5" /> Enrolled
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-caption">
                        Disabled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-caption text-muted-foreground px-4 py-3">
                    {staff.lastLoginAt
                      ? new Date(staff.lastLoginAt).toLocaleString('en-GB')
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-caption text-muted-foreground px-4 py-3">
                    {new Date(staff.createdAt).toLocaleDateString('en-GB')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
