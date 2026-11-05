'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatHotelDateTime } from '@/lib/format';
import type { AuditDetailResponse } from '@/types/audit.types';

export function AuditDetailDrawer({
  audit,
  onClose,
  isOwner = false,
}: {
  audit: AuditDetailResponse | null;
  onClose: () => void;
  isOwner?: boolean;
}) {
  if (!audit) return null;

  return (
    <Sheet
      open={Boolean(audit)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" size="xl">
        <SheetHeader className="flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SheetTitle>Audit Log Entry</SheetTitle>
              <span className="rounded-sm border border-line bg-paper px-2 py-0.5 font-mono text-caption capitalize">
                {audit.action}
              </span>
            </div>
            <SheetDescription className="mt-0.5 font-mono text-caption">
              {audit.entity} • ID: {audit.entityId}
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <SheetBody className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-control border border-line bg-paper/50 p-4 text-caption">
            <div>
              <span className="block text-muted-foreground">
                Timestamp (Hotel Local)
              </span>
              <span className="font-medium text-ink">
                {formatHotelDateTime(audit.createdAt)}
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">
                Timestamp (UTC)
              </span>
              <span className="font-mono text-ink">{audit.utcTime}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Actor</span>
              <span className="font-medium text-ink">
                {audit.actorName} ({audit.actorRole})
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">Linked Entity</span>
              {audit.entityLink && audit.isEntityAvailable ? (
                <Link
                  href={audit.entityLink}
                  className="inline-flex items-center gap-1 font-semibold text-brand-ink hover:underline"
                >
                  <span>{audit.entityRef || audit.entityId}</span>
                  <ExternalLink className="size-3" />
                </Link>
              ) : (
                <span className="text-muted-foreground italic">
                  {audit.entityRef || audit.entityId}
                </span>
              )}
            </div>

            {isOwner && audit.ipAddress && (
              <div>
                <span className="block text-muted-foreground">
                  IP Address (Owner Only)
                </span>
                <span className="font-mono text-ink">{audit.ipAddress}</span>
              </div>
            )}
            {isOwner && audit.userAgent && (
              <div className="col-span-2">
                <span className="block text-muted-foreground">
                  User Agent (Owner Only)
                </span>
                <span className="block truncate font-mono text-micro text-muted-foreground">
                  {audit.userAgent}
                </span>
              </div>
            )}
          </div>

          {/* Reason if provided */}
          {audit.reason && (
            <div className="space-y-1 rounded-control border border-line p-4">
              <span className="text-caption font-semibold text-muted-foreground uppercase">
                Staff Reason / Justification
              </span>
              <p className="text-ink">{audit.reason}</p>
            </div>
          )}

          {/* Before & After Diffs */}
          <div className="space-y-3">
            <h3 className="flex items-center justify-between font-semibold text-ink">
              <span>Field Changes</span>
              <span className="text-caption font-normal text-muted-foreground">
                {audit.diffs.length} field{audit.diffs.length === 1 ? '' : 's'}{' '}
                modified
              </span>
            </h3>

            {audit.diffs.length === 0 ? (
              <div className="rounded-control border border-dashed border-line p-4 text-center text-caption text-muted-foreground">
                No state diff recorded for this operation.
              </div>
            ) : (
              <div className="space-y-2">
                {audit.diffs.map((diff) => (
                  <div
                    key={diff.field}
                    className="space-y-2 rounded-control border border-line bg-card p-3"
                  >
                    <div className="text-caption font-semibold text-ink">
                      {diff.label}
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-caption">
                      <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-2 wrap-break-word text-destructive">
                        <span className="mb-0.5 block text-micro font-bold text-muted-foreground uppercase">
                          Before:
                        </span>
                        {diff.before}
                      </div>
                      <div className="rounded-sm border border-success/20 bg-success/5 p-2 wrap-break-word text-success">
                        <span className="mb-0.5 block text-micro font-bold text-muted-foreground uppercase">
                          After:
                        </span>
                        {diff.after}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
