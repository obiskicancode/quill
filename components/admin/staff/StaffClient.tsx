'use client';

import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';

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
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useStaffDetail, useStaffList } from '@/hooks/services/admin/use-staff';
import type {
  StaffDetailResponse,
  StaffListItem,
  StaffQueryParams,
} from '@/types/staff.types';

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

function buildFallbackDetail(staff: StaffListItem): StaffDetailResponse {
  return {
    ...staff,
    invitedByName: null,
    deactivatedByName: null,
    activeSessions: [],
    recentAudits: [],
  };
}

export function StaffClient() {
  const [filters, setFilters] = useState<StaffQueryParams>({
    role: 'all',
    status: 'all',
    q: '',
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffFallback, setSelectedStaffFallback] =
    useState<StaffListItem | null>(null);
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
  const selectedStaff =
    detailQuery.data ??
    (selectedStaffFallback && detailQuery.isError
      ? buildFallbackDetail(selectedStaffFallback)
      : null);

  const handleRowClick = (staffItem: StaffListItem) => {
    setSelectedStaffFallback(staffItem);
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
          onClose={() => {
            setSelectedStaffId(null);
            setSelectedStaffFallback(null);
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
