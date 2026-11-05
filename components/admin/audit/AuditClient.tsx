'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { useAuditDetail, useAuditLogs } from '@/hooks/services/admin/use-audit';
import { AuditQuerySchema } from '@/schemas/audit.schema';
import type {
  AuditDetailResponse,
  AuditListItem,
  AuditPreset,
  AuditQueryParams,
} from '@/types/audit.types';

import { AuditDetailDrawer } from './AuditDetailDrawer';
import { AuditTable } from './AuditTable';

export function AuditClient({ isOwner = false }: { isOwner?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo<AuditQueryParams>(() => {
    const parsed = AuditQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    return parsed.success ? parsed.data : AuditQuerySchema.parse({});
  }, [searchParams]);
  const [searchValue, setSearchValue] = useState(filters.q ?? '');

  const updateUrlParams = useCallback(
    (updates: Partial<AuditQueryParams>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        const isDefault =
          value === undefined ||
          value === '' ||
          (key === 'preset' && value === 'all') ||
          (key === 'page' && value === 1) ||
          (key === 'pageSize' && value === 25) ||
          (key === 'sort' && value === 'created_at') ||
          (key === 'order' && value === 'desc');
        if (isDefault) params.delete(key);
        else params.set(key, String(value));
      }

      if (!('page' in updates)) params.delete('page');

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchValue(filters.q ?? '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = searchValue.trim();
      if ((filters.q ?? '') !== nextQuery) {
        updateUrlParams({ q: nextQuery || undefined });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.q, searchValue, updateUrlParams]);

  const [selectedItem, setSelectedItem] = useState<AuditListItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const logsQuery = useAuditLogs(filters);
  const detailQuery = useAuditDetail(
    selectedItem?.id ?? null,
    Boolean(selectedItem),
  );

  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;
  const loading = refreshing || (logsQuery.isPending && !logsQuery.data);
  const error = logsQuery.error
    ? logsQuery.error instanceof Error
      ? logsQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_AUDIT_LOGS
    : null;

  const loadLogs = async () => {
    setRefreshing(true);
    try {
      await logsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRowClick = (item: AuditListItem) => {
    setSelectedItem(item);
  };

  const selectedAudit: AuditDetailResponse | null = selectedItem
    ? (detailQuery.data ??
      (detailQuery.isError
        ? {
            ...selectedItem,
            isEntityAvailable: true,
            reason: selectedItem.summary,
            diffs: [],
            userAgent: null,
          }
        : null))
    : null;

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
      {/* Preset Filters Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {presets
            .filter((p) => !p.ownerOnly || isOwner)
            .map((preset) => {
              const active = filters.preset === preset.key;
              return (
                <Button
                  key={preset.key}
                  variant={active ? 'primary' : 'secondary'}
                  size="xs"
                  className="rounded-full"
                  onClick={() =>
                    updateUrlParams({ preset: preset.key, page: 1 })
                  }
                >
                  {preset.label}
                </Button>
              );
            })}
        </div>
        {total > 0 && (
          <span className="text-caption font-medium text-muted-foreground">
            {total} recorded entries
          </span>
        )}
      </div>

      {/* Search Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={
              isOwner
                ? 'Search entity ID, reference, IP address, summary...'
                : 'Search entity ID, reference, summary...'
            }
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              type="button"
              variant="secondary"
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
            variant="secondary"
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
            <Button variant="secondary" size="sm" onClick={loadLogs}>
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-muted/30 px-4 py-3 text-caption text-muted-foreground">
            <span>
              Showing {logs.length} of {total} audit log record(s)
            </span>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      updateUrlParams({
                        page: Math.max(1, (filters.page ?? 1) - 1),
                      })
                    }
                    disabled={(filters.page ?? 1) <= 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-caption font-medium text-muted-foreground">
                    Page {filters.page ?? 1} of{' '}
                    {Math.max(1, Math.ceil(total / (filters.pageSize ?? 25)))}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      updateUrlParams({ page: (filters.page ?? 1) + 1 })
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
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
