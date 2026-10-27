'use client';

import { Download, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ERROR_MESSAGES } from '@/constants/error-messages';
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
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_AUDIT_LOGS;
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
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_LOAD_AUDIT_LOGS;
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
                <Button
                  key={preset.key}
                  variant={active ? 'default' : 'outline'}
                  size="xs"
                  className="rounded-full"
                  onClick={() =>
                    setFilters({ ...filters, preset: preset.key, page: 1 })
                  }
                >
                  {preset.label}
                </Button>
              );
            })}
        </div>
        {total > 0 && (
          <span className="text-caption text-muted-foreground font-medium">
            {total} recorded entries
          </span>
        )}
      </div>

      {/* Search Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md min-w-[15rem] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
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
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              title="Export filtered audit logs to CSV (owner only, capped at 10k rows)"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLogs}
            title="Refresh audit logs"
            className="px-2"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <AdminLoading label="Loading immutable audit logs..." />
      ) : error ? (
        <AdminError
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadLogs}>
              Retry
            </Button>
          }
        />
      ) : logs.length === 0 ? (
        <AdminEmpty title="No audit entries found">
          Try selecting another preset filter or clearing your search query.
        </AdminEmpty>
      ) : (
        <div className="space-y-3">
          <AuditTable
            items={logs}
            isOwner={isOwner}
            onRowClick={handleRowClick}
          />
          <div className="bg-muted/30 border-line text-caption text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <span>
              Showing {logs.length} of {total} audit log record(s)
            </span>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, (prev.page ?? 1) - 1),
                      }))
                    }
                    disabled={(filters.page ?? 1) <= 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-caption text-muted-foreground px-2 font-medium">
                    Page {filters.page ?? 1} of{' '}
                    {Math.max(1, Math.ceil(total / (filters.pageSize ?? 25)))}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: (prev.page ?? 1) + 1,
                      }))
                    }
                    disabled={
                      (filters.page ?? 1) >=
                      Math.ceil(total / (filters.pageSize ?? 25))
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
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
