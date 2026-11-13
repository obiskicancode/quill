'use client';

import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import {
  AdminStatusBadge,
  staffStatusTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { clickableRowProps } from '@/components/admin/clickableRow';
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
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useStaffDetail, useStaffList } from '@/hooks/services/admin/use-staff';
import { formatHotelDate, formatHotelDateTime } from '@/lib/format';
import type { StaffListItem, StaffQueryParams } from '@/types/staff.types';

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

/**
 * Staff directory: role/status filters, invite dialog and a detail sheet for
 * profile, security and session actions.
 */
export function StaffClient() {
  const [filters, setFilters] = useState<StaffQueryParams>({
    role: 'all',
    status: 'all',
    q: '',
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Step-up authentication coordinator
  const [stepUpState, setStepUpState] = useState<{
    isOpen: boolean;
    onVerified: () => void;
  }>({
    isOpen: false,
    onVerified: () => {},
  });

  const staffQuery = useStaffList(filters);
  const detailQuery = useStaffDetail(selectedStaffId);

  const staffList = staffQuery.data ?? [];
  const loading =
    staffQuery.isPending ||
    (staffQuery.isFetching && Boolean(staffQuery.error));
  const error = staffQuery.error
    ? staffQuery.error instanceof Error
      ? staffQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_STAFF_MEMBERS
    : null;
  const selectedStaff = detailQuery.data ?? null;
  const detailError = detailQuery.isError
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_STAFF_MEMBERS
    : null;

  const handleRowClick = (staffItem: StaffListItem) => {
    setSelectedStaffId(staffItem.id);
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
      {/* Filter and action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative max-w-sm min-w-55 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
            <Button
              variant="secondary"
              onClick={() => void staffQuery.refetch()}
            >
              Retry
            </Button>
          }
        />
      ) : staffList.length === 0 ? (
        <AdminEmpty title="No staff members found">
          Adjust your filters or invite your first team member.
        </AdminEmpty>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <Table className="w-full text-left text-small">
            <caption className="sr-only">Staff directory</caption>
            <TableHeader className="border-b border-line bg-paper text-caption font-semibold text-muted-foreground uppercase">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-muted-foreground">
                  Staff Member
                </TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">
                  Role
                </TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">
                  Two-Factor (2FA)
                </TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">
                  Last Login
                </TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-line">
              {staffList.map((staff) => (
                <TableRow
                  key={staff.id}
                  {...clickableRowProps(
                    `Open staff detail for ${staff.fullName}`,
                    () => handleRowClick(staff),
                    'transition-colors hover:bg-paper/70 focus:bg-paper/70',
                  )}
                >
                  <TableCell className="px-4 py-3">
                    <div className="font-semibold text-ink">
                      {staff.fullName}
                    </div>
                    <div className="text-caption text-muted-foreground">
                      {staff.email}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="info">{staff.role}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <AdminStatusBadge tone={staffStatusTone(staff.status)}>
                      {statusLabel(staff.status)}
                    </AdminStatusBadge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {staff.mfaEnabled ? (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-success">
                        <ShieldCheck className="size-3.5" /> Enrolled
                      </span>
                    ) : (
                      <span className="text-caption text-muted-foreground">
                        Disabled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-caption text-muted-foreground">
                    {staff.lastLoginAt
                      ? formatHotelDateTime(staff.lastLoginAt)
                      : 'Never'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-caption text-muted-foreground">
                    {formatHotelDate(staff.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Staff Detail Sheet */}
      {selectedStaffId && (
        <StaffDetailSheet
          isOpen
          staff={selectedStaff}
          error={detailError}
          onRetry={() => void detailQuery.refetch()}
          onClose={() => {
            setSelectedStaffId(null);
          }}
          onReload={async () => {
            await Promise.all([staffQuery.refetch(), detailQuery.refetch()]);
          }}
          onRequestStepUp={handleTriggerStepUp}
        />
      )}

      {/* Invite Staff Dialog */}
      <InviteStaffDialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={(msg) => {
          toast.add({ title: msg, type: 'success' });
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
