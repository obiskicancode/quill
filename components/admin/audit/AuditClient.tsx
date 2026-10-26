'use client';

import { Download, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import type {
  AuditDetailResponse,
  AuditListItem,
  AuditPreset,
  AuditQueryParams,
} from '@/types/audit-admin.types';

import { AuditDetailDrawer } from './AuditDetailDrawer';
import { AuditTable } from './AuditTable';
import { LogIntegrityBadge } from './LogIntegrityBadge';

export function AuditClient({ isOwner = false }: { isOwner?: boolean }) {
  const [logs, setLogs] = useState<AuditListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<AuditQueryParams>({
    preset: 'all',
    q: '',
    page: 1,
    pageSize: 25,
    sort: 'created_at',
    order: 'desc',
  });

  const [selectedAudit, setSelectedAudit] =
    useState<AuditDetailResponse | null>(null);

  const loadLogs = useCallback(() => {
    setLoading(true);
    adminService
      .listAuditLogs(filters)
      .then((res) => {
        if (res.data) {
          setLogs(res.data.items);
          setTotal(res.data.total);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Failed to load audit logs.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    let active = true;
    adminService
      .listAuditLogs(filters)
      .then((res) => {
        if (!active) return;
        if (res.data) {
          setLogs(res.data.items);
          setTotal(res.data.total);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof Error ? err.message : 'Failed to load audit logs.';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const handleRowClick = async (item: AuditListItem) => {
    try {
      const res = await adminService.getAuditDetail(item.id);
      if (res.data) {
        setSelectedAudit(res.data);
      } else {
        setSelectedAudit({
          ...item,
          isEntityAvailable: true,
          reason: item.summary,
          diffs: [],
          userAgent: null,
        });
      }
    } catch {
      setSelectedAudit({
        ...item,
        isEntityAvailable: true,
        reason: item.summary,
        diffs: [],
        userAgent: null,
      });
    }
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
    const link = document.createElement('a');
    link.href = `/api/admin/audit/export?${q.toString()}`;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presets: { key: AuditPreset; label: string; ownerOnly?: boolean }[] = [
    { key: 'all', label: 'All entries' },
    { key: 'rates', label: 'Price & rate changes' },
    { key: 'payments', label: 'Payments & refunds' },
    { key: 'bank_accounts', label: 'Bank accounts' },
    { key: 'cancellations', label: 'Cancellations' },
    { key: 'staff_security', label: 'Staff & security', ownerOnly: true },
  ];

  return (
    <div className="space-y-4">
      {/* Integrity Badge */}
      <LogIntegrityBadge />

      {/* Preset Filters Strip */}
      <div className="border-line flex flex-wrap items-center justify-between gap-1.5 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {presets
            .filter((p) => !p.ownerOnly || isOwner)
            .map((preset) => {
              const active = filters.preset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() =>
                    setFilters({ ...filters, preset: preset.key, page: 1 })
                  }
                  className={`text-caption rounded-full px-3 py-1 font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-ink shadow-sm'
                      : 'bg-paper text-muted hover:text-ink hover:bg-surface border-line border'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
        </div>
        {total > 0 && (
          <span className="text-caption text-muted font-medium">
            {total} recorded entries
          </span>
        )}
      </div>

      {/* Search Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md min-w-[240px] flex-1">
          <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder={
              isOwner
                ? 'Search entity ID, reference, IP address, summary...'
                : 'Search entity ID, reference, summary...'
            }
            value={filters.q || ''}
            onChange={(e) =>
              setFilters({ ...filters, q: e.target.value, page: 1 })
            }
            className="border-line bg-surface text-small text-ink placeholder:text-muted focus:border-primary focus:ring-primary w-full rounded-md border py-1.5 pr-3 pl-9 focus:ring-1 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="border-line bg-surface text-caption text-ink hover:bg-paper inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-semibold"
              title="Export filtered audit logs to CSV (owner only, capped at 10k rows)"
            >
              <Download className="size-3.5" />
              Export CSV
            </button>
          )}

          <button
            type="button"
            onClick={loadLogs}
            className="border-line bg-surface text-muted hover:text-ink rounded-md border p-1.5"
            title="Refresh audit logs"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <AdminLoading label="Loading immutable audit logs..." />
      ) : error ? (
        <AdminError
          message={error}
          action={
            <button onClick={loadLogs} className="btn-secondary">
              Retry
            </button>
          }
        />
      ) : logs.length === 0 ? (
        <AdminEmpty title="No audit entries found">
          Try selecting another preset filter or clearing your search query.
        </AdminEmpty>
      ) : (
        <AuditTable
          items={logs}
          isOwner={isOwner}
          onRowClick={handleRowClick}
        />
      )}

      {/* Detail Drawer */}
      {selectedAudit && (
        <AuditDetailDrawer
          audit={selectedAudit}
          isOwner={isOwner}
          onClose={() => setSelectedAudit(null)}
        />
      )}
    </div>
  );
}
