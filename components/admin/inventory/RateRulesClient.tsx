'use client';

import { Edit2, Filter, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
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
      <div className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="text-muted size-4" />
            <select
              value={selectedRoomTypeId}
              onChange={(e) => setSelectedRoomTypeId(e.target.value)}
              className="bg-background text-foreground focus:border-brand border-line text-small rounded border px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All Room Types</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
            }
            className="bg-background text-foreground focus:border-brand border-line text-small rounded border px-3 py-1.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

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
        <div className="rounded-card border-line bg-surface overflow-x-auto border">
          <table className="text-small w-full text-left">
            <thead className="border-line bg-paper text-muted border-b">
              <tr>
                <th className="py-3 pr-3 pl-4 font-medium">Rule Name</th>
                <th className="px-4 py-3 font-medium">Room Type</th>
                <th className="px-4 py-3 font-medium">Date Range</th>
                <th className="px-4 py-3 font-medium">Adjustment</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {filteredRules.map((r) => (
                <tr key={r.id} className="hover:bg-paper/40 transition-colors">
                  <td className="text-foreground py-3 pr-3 pl-4 font-semibold">
                    <div>
                      {r.name}
                      {r.minNights && (
                        <span className="bg-paper text-muted ml-2 rounded px-1.5 py-0.5 text-xs font-normal">
                          Min {r.minNights} nights
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="text-muted px-4 py-3">
                    {r.roomTypeName || 'All Room Types (Global)'}
                  </td>

                  <td className="text-muted px-4 py-3">
                    {r.startDate} to {r.endDate}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-foreground font-semibold">
                      {formatAdjustment(r)}
                    </span>
                  </td>

                  <td className="text-muted px-4 py-3">
                    Priority {r.priority}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.isActive
                          ? 'bg-success/15 text-success'
                          : 'bg-muted/20 text-muted'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          r.isActive ? 'bg-success' : 'bg-muted'
                        }`}
                      />
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="py-3 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
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
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(r)}
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
