'use client';

import { Edit2, Filter, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
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
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useDeleteRateRule,
  useRateRules,
} from '@/hooks/services/admin/use-inventory';
import { formatMinor } from '@/lib/format';
import { bpsToPercentage } from '@/lib/rate-resolution';
import type {
  AdminRateRule,
  AdminRoomTypeListItem,
} from '@/types/inventory.types';

import { RateRuleDialog } from './RateRuleDialog';

interface RateRulesClientProps {
  initialRules: AdminRateRule[];
  roomTypes: AdminRoomTypeListItem[];
}

/** Seasonal rate-rule list with create/edit/delete and pricing preview. */
export function RateRulesClient({
  initialRules,
  roomTypes,
}: RateRulesClientProps) {
  const confirm = useConfirm();
  const rulesQuery = useRateRules(undefined, initialRules);
  const deleteRateRule = useDeleteRateRule();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const rules = rulesQuery.data ?? [];
  const loading = rulesQuery.isFetching;
  const error =
    deleteError ??
    (rulesQuery.error instanceof Error
      ? rulesQuery.error.message
      : rulesQuery.error
        ? ERROR_MESSAGES.FAILED_TO_LOAD_RATE_RULES_UI
        : null);

  // Filters
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AdminRateRule | null>(null);

  async function refresh() {
    setDeleteError(null);
    await rulesQuery.refetch();
  }

  const filtersActive = selectedRoomTypeId !== 'all' || statusFilter !== 'all';

  function clearFilters() {
    setSelectedRoomTypeId('all');
    setStatusFilter('all');
  }

  function openCreate() {
    setEditingRule(null);
    setDialogOpen(true);
  }

  const filteredRules = rules.filter((r) => {
    if (selectedRoomTypeId !== 'all') {
      if (r.roomTypeId !== selectedRoomTypeId && r.roomTypeId !== null) {
        return false;
      }
    }
    if (statusFilter === 'active' && !r.isActive) return false;
    if (statusFilter === 'inactive' && r.isActive) return false;
    return true;
  });

  function formatAdjustment(r: AdminRateRule): string {
    switch (r.adjustmentType) {
      case 'percent_markup': {
        const pct = bpsToPercentage(r.adjustmentValue);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
      }
      case 'fixed_price':
        return `Fixed ${formatMinor(r.adjustmentValue)}`;
      case 'amount_markup': {
        const val = r.adjustmentValue;
        return val >= 0
          ? `+${formatMinor(val)}`
          : `-${formatMinor(Math.abs(val))}`;
      }
    }
  }

  async function handleDelete(rule: AdminRateRule) {
    const sure = await confirm({
      title: `Delete rate rule "${rule.name}"?`,
      description:
        'Nights already priced by it keep their recorded rates; future ones stop being adjusted.',
      confirmLabel: 'Delete rule',
      tone: 'danger',
    });
    if (!sure) return;

    try {
      await deleteRateRule.mutateAsync(rule.id);
      toast.add({ title: SUCCESS_MESSAGES.RATE_RULE_DELETED, type: 'success' });
      await refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_DELETE_RATE_RULE,
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters & Action Bar */}
      <div className="flex flex-col flex-wrap gap-3 rounded-card border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select
              items={[
                { value: 'all', label: 'All Room Types' },
                ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
              ]}
              value={selectedRoomTypeId}
              onValueChange={(val) => {
                if (val) setSelectedRoomTypeId(val);
              }}
            >
              <SelectTrigger aria-label="Filter by room type" className="w-40">
                <SelectValue placeholder="All Room Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Room Types</SelectItem>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            items={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
            value={statusFilter}
            onValueChange={(val) => {
              if (val) setStatusFilter(val as 'all' | 'active' | 'inactive');
            }}
          >
            <SelectTrigger aria-label="Filter by status" className="w-35">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" /> New Rate Rule
        </Button>
      </div>

      {error && (
        <AdminError
          message={error}
          action={
            <Button size="sm" variant="secondary" onClick={refresh}>
              Retry
            </Button>
          }
        />
      )}

      {loading && rules.length === 0 ? (
        <AdminLoading label="Loading rate rules..." />
      ) : filteredRules.length === 0 ? (
        <AdminEmpty
          title={
            filtersActive
              ? 'No rate rules match these filters'
              : 'No rate rules yet'
          }
          action={
            filtersActive ? (
              <Button size="sm" variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openCreate}>
                New rate rule
              </Button>
            )
          }
        >
          {filtersActive
            ? 'Every rule is hidden by the current room type or status filter.'
            : 'Create rules to adjust pricing dynamically for peak holiday seasons, weekend uplifts, or extended stay discounts.'}
        </AdminEmpty>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <Table className="w-full text-left text-small">
            <TableHeader className="border-b border-line bg-paper text-muted-foreground">
              <TableRow className="border-line hover:bg-transparent">
                <TableHead className="py-3 pr-3 pl-4 font-medium">
                  Rule Name
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Room Type
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Date Range
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Adjustment
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Priority
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                <TableHead className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-line">
              {filteredRules.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-line transition-colors hover:bg-paper/40"
                >
                  <TableCell className="py-3 pr-3 pl-4 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{r.name}</span>
                      {r.minNights && (
                        <Badge
                          variant="outline"
                          className="text-caption font-normal text-muted-foreground"
                        >
                          Min {r.minNights} nights
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {r.roomTypeName || 'All Room Types (Global)'}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {r.startDate} to {r.endDate}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <span className="font-semibold text-foreground">
                      {formatAdjustment(r)}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-muted-foreground">
                    Priority {r.priority}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <AdminStatusBadge
                      tone={r.isActive ? 'success' : 'neutral'}
                      dot
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </AdminStatusBadge>
                  </TableCell>

                  <TableCell className="py-3 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingRule(r);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit ${r.name}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(r)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      {dialogOpen && (
        <RateRuleDialog
          key={editingRule?.id || 'new'}
          open={dialogOpen}
          rule={editingRule}
          roomTypes={roomTypes}
          onClose={() => setDialogOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
