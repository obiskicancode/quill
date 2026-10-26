'use client';

import { Edit2, Filter, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { bpsToPercentage, minorToNaira } from '@/lib/rate-resolution';
import type {
  AdminRateRule,
  AdminRoomTypeListItem,
} from '@/types/inventory.types';

import { RateRuleDialog } from './RateRuleDialog';

interface RateRulesClientProps {
  initialRules: AdminRateRule[];
  roomTypes: AdminRoomTypeListItem[];
}

export function RateRulesClient({
  initialRules,
  roomTypes,
}: RateRulesClientProps) {
  const [rules, setRules] = useState<AdminRateRule[]>(initialRules);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AdminRateRule | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const q = selectedRoomTypeId !== 'all' ? selectedRoomTypeId : undefined;
      const res = await adminService.listRateRules(q);
      if (res.data) {
        setRules(res.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load rate rules',
      );
    } finally {
      setLoading(false);
    }
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
        return `Fixed ₦${minorToNaira(r.adjustmentValue)}`;
      case 'amount_markup': {
        const val = r.adjustmentValue;
        return val >= 0
          ? `+₦${minorToNaira(val)}`
          : `-₦${minorToNaira(Math.abs(val))}`;
      }
    }
  }

  async function handleDelete(rule: AdminRateRule) {
    if (!confirm(`Are you sure you want to delete rate rule "${rule.name}"?`)) {
      return;
    }

    try {
      await adminService.deleteRateRule(rule.id);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete rate rule',
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters & Action Bar */}
      <div className="rounded-card border-line bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground size-4" />
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
              <SelectTrigger
                aria-label="Filter by room type"
                className="w-[160px]"
              >
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
            <SelectTrigger aria-label="Filter by status" className="w-[140px]">
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
            variant="outline"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingRule(null);
            setDialogOpen(true);
          }}
          className="gap-1.5"
        >
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
        <AdminEmpty title="No rate rules found">
          Create rules to adjust pricing dynamically for peak holiday seasons,
          weekend uplifts, or extended stay discounts.
        </AdminEmpty>
      ) : (
        <div className="rounded-card border-line bg-card overflow-x-auto border">
          <Table className="text-small w-full text-left">
            <TableHeader className="border-line bg-paper text-muted-foreground border-b">
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
            <TableBody className="divide-line divide-y">
              {filteredRules.map((r) => (
                <TableRow
                  key={r.id}
                  className="hover:bg-paper/40 border-line transition-colors"
                >
                  <TableCell className="text-foreground py-3 pr-3 pl-4 font-semibold">
                    <div className="flex items-center gap-2">
                      <span>{r.name}</span>
                      {r.minNights && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground text-xs font-normal"
                        >
                          Min {r.minNights} nights
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4 py-3">
                    {r.roomTypeName || 'All Room Types (Global)'}
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4 py-3">
                    {r.startDate} to {r.endDate}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <span className="text-foreground font-semibold">
                      {formatAdjustment(r)}
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4 py-3">
                    Priority {r.priority}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.isActive
                          ? 'border-success/20 bg-success/15 text-success'
                          : 'border-muted/30 bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          r.isActive ? 'bg-success' : 'bg-muted'
                        }`}
                      />
                      {r.isActive ? 'Active' : 'Inactive'}
                    </Badge>
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
