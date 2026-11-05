'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { clickableRowProps } from '@/components/admin/clickableRow';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatHotelDateTime,
  formatHotelDayMonth,
  formatHotelTime,
} from '@/lib/format';
import type { AuditListItem } from '@/types/audit.types';

export function AuditTable({
  items,
  onRowClick,
  isOwner = false,
}: {
  items: AuditListItem[];
  onRowClick: (item: AuditListItem) => void;
  isOwner?: boolean;
}) {
  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-card md:block">
        <Table className="w-full text-left text-small">
          <caption className="sr-only">Audit log entries</caption>
          <TableHeader className="sticky top-0 z-10 border-b border-line bg-paper text-caption font-semibold text-muted-foreground uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead
                scope="col"
                className="px-4 py-3 text-muted-foreground"
              >
                Time
              </TableHead>
              <TableHead
                scope="col"
                className="px-3 py-3 text-muted-foreground"
              >
                Actor
              </TableHead>
              <TableHead
                scope="col"
                className="px-3 py-3 text-muted-foreground"
              >
                Action
              </TableHead>
              <TableHead
                scope="col"
                className="px-3 py-3 text-muted-foreground"
              >
                Entity
              </TableHead>
              <TableHead
                scope="col"
                className="px-3 py-3 text-muted-foreground"
              >
                Target Ref / ID
              </TableHead>
              <TableHead
                scope="col"
                className="px-4 py-3 text-muted-foreground"
              >
                Summary
              </TableHead>
              {isOwner && (
                <TableHead
                  scope="col"
                  className="px-3 py-3 text-muted-foreground"
                >
                  IP Address
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-line">
            {items.map((entry) => (
              <TableRow
                key={entry.id}
                {...clickableRowProps(
                  `Open audit entry: ${entry.action}`,
                  () => onRowClick(entry),
                  'transition-colors hover:bg-paper/80',
                )}
              >
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="cursor-help border-b border-dotted border-muted/50 font-medium text-ink"
                    title={`Exact UTC: ${entry.utcTime}`}
                  >
                    {formatHotelTime(entry.createdAt)}
                  </span>
                  <div className="text-caption text-muted-foreground">
                    {formatHotelDayMonth(entry.createdAt)}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="max-w-32.5 truncate font-semibold text-ink">
                    {entry.actorName}
                  </div>
                  <div className="text-caption text-muted-foreground capitalize">
                    {entry.actorRole}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <span className="rounded-sm border border-line bg-paper px-2 py-0.5 font-mono text-caption capitalize">
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-3 font-mono text-caption text-ink capitalize">
                  {entry.entity.replace('_', ' ')}
                </TableCell>
                <TableCell className="px-3 py-3 font-mono text-caption">
                  {entry.entityLink ? (
                    <Link
                      href={entry.entityLink}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 font-semibold text-brand-ink hover:underline"
                    >
                      <span className="max-w-30 truncate">
                        {entry.entityRef || entry.entityId}
                      </span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                  ) : (
                    <span className="block max-w-30 truncate text-muted-foreground">
                      {entry.entityRef || entry.entityId}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-sm truncate px-4 py-3 text-caption text-muted-foreground">
                  {entry.summary}
                </TableCell>
                {isOwner && (
                  <TableCell className="px-3 py-3 font-mono text-caption whitespace-nowrap text-muted-foreground">
                    {entry.ipAddress || '—'}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {items.map((entry) => (
          <div
            key={entry.id}
            {...clickableRowProps(
              `Open audit entry: ${entry.action}`,
              () => onRowClick(entry),
              'space-y-2 rounded-card border border-line bg-card p-4 shadow-raised transition-colors hover:bg-paper/50',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-sm border border-line bg-paper px-2 py-0.5 font-mono text-caption font-semibold text-ink capitalize">
                {entry.action}
              </span>
              <span className="text-caption text-muted-foreground">
                {formatHotelDateTime(entry.createdAt)}
              </span>
            </div>

            <div className="text-small font-semibold text-ink">
              {entry.actorName} ({entry.actorRole})
            </div>

            <p className="text-caption text-muted-foreground">
              {entry.summary}
            </p>

            <div className="flex items-center justify-between border-t border-line/60 pt-2 text-micro text-muted-foreground">
              <span>Entity: {entry.entity}</span>
              <span className="font-mono">
                {entry.entityRef || entry.entityId}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
