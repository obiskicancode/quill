'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AuditListItem } from '@/types/audit-admin.types';

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
      <div className="rounded-card border-line bg-card hidden overflow-hidden border md:block">
        <Table className="text-small w-full text-left">
          <caption className="sr-only">Audit log entries</caption>
          <TableHeader className="border-line bg-paper text-caption text-muted-foreground sticky top-0 z-10 border-b font-semibold uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead
                scope="col"
                className="text-muted-foreground px-4 py-3"
              >
                Time
              </TableHead>
              <TableHead
                scope="col"
                className="text-muted-foreground px-3 py-3"
              >
                Actor
              </TableHead>
              <TableHead
                scope="col"
                className="text-muted-foreground px-3 py-3"
              >
                Action
              </TableHead>
              <TableHead
                scope="col"
                className="text-muted-foreground px-3 py-3"
              >
                Entity
              </TableHead>
              <TableHead
                scope="col"
                className="text-muted-foreground px-3 py-3"
              >
                Target Ref / ID
              </TableHead>
              <TableHead
                scope="col"
                className="text-muted-foreground px-4 py-3"
              >
                Summary
              </TableHead>
              {isOwner && (
                <TableHead
                  scope="col"
                  className="text-muted-foreground px-3 py-3"
                >
                  IP Address
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-line divide-y">
            {items.map((entry) => (
              <TableRow
                key={entry.id}
                onClick={() => onRowClick(entry)}
                className="hover:bg-paper/80 cursor-pointer transition-colors"
              >
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="text-ink border-muted/50 cursor-help border-b border-dotted font-medium"
                    title={`Exact UTC: ${entry.utcTime}`}
                  >
                    {new Date(entry.createdAt).toLocaleTimeString('en-GB', {
                      timeZone: 'Africa/Lagos',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="text-muted-foreground text-caption">
                    {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                      timeZone: 'Africa/Lagos',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="text-ink max-w-32.5 truncate font-semibold">
                    {entry.actorName}
                  </div>
                  <div className="text-caption text-muted-foreground capitalize">
                    {entry.actorRole}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <span className="text-caption bg-paper border-line rounded border px-2 py-0.5 font-mono capitalize">
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell className="text-caption text-ink px-3 py-3 font-mono capitalize">
                  {entry.entity.replace('_', ' ')}
                </TableCell>
                <TableCell className="text-caption px-3 py-3 font-mono">
                  {entry.entityLink ? (
                    <Link
                      href={entry.entityLink}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      <span className="max-w-30 truncate">
                        {entry.entityRef || entry.entityId}
                      </span>
                      <ExternalLink className="text-muted-foreground size-3" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground block max-w-30 truncate">
                      {entry.entityRef || entry.entityId}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-caption text-muted-foreground max-w-sm truncate px-4 py-3">
                  {entry.summary}
                </TableCell>
                {isOwner && (
                  <TableCell className="text-caption text-muted-foreground px-3 py-3 font-mono whitespace-nowrap">
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
            onClick={() => onRowClick(entry)}
            className="rounded-card border-line bg-card hover:bg-paper/50 cursor-pointer space-y-2 border p-4 shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-caption bg-paper border-line text-ink rounded border px-2 py-0.5 font-mono font-semibold capitalize">
                {entry.action}
              </span>
              <span className="text-caption text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString('en-GB', {
                  timeZone: 'Africa/Lagos',
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            <div className="text-small text-ink font-semibold">
              {entry.actorName} ({entry.actorRole})
            </div>

            <p className="text-caption text-muted-foreground">
              {entry.summary}
            </p>

            <div className="border-line/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-[0.6875rem]">
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
