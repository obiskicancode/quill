'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { AuditDetailResponse } from '@/types/audit-admin.types';

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
      <SheetContent
        side="right"
        showCloseButton
        className="border-line bg-card w-full max-w-xl gap-0 border-l p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-line flex-row items-center justify-between border-b px-6 py-4 pr-14">
          <div>
            <div className="flex items-center gap-2">
              <SheetTitle className="text-h3 font-display text-ink font-semibold">
                Audit Log Entry
              </SheetTitle>
              <span className="border-line bg-paper text-caption rounded border px-2 py-0.5 font-mono capitalize">
                {audit.action}
              </span>
            </div>
            <SheetDescription className="text-caption text-muted-foreground mt-0.5 font-mono">
              {audit.entity} • ID: {audit.entityId}
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {/* Metadata Grid */}
          <div className="border-line bg-paper/50 text-caption grid grid-cols-2 gap-3 rounded-lg border p-4">
            <div>
              <span className="text-muted-foreground block">
                Timestamp (Hotel Local)
              </span>
              <span className="text-ink font-medium">
                {new Date(audit.createdAt).toLocaleString('en-GB', {
                  timeZone: 'Africa/Lagos',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">
                Timestamp (UTC)
              </span>
              <span className="text-ink font-mono">{audit.utcTime}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Actor</span>
              <span className="text-ink font-medium">
                {audit.actorName} ({audit.actorRole})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Linked Entity</span>
              {audit.entityLink && audit.isEntityAvailable ? (
                <Link
                  href={audit.entityLink}
                  className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
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
                <span className="text-muted-foreground block">
                  IP Address (Owner Only)
                </span>
                <span className="text-ink font-mono">{audit.ipAddress}</span>
              </div>
            )}
            {isOwner && audit.userAgent && (
              <div className="col-span-2">
                <span className="text-muted-foreground block">
                  User Agent (Owner Only)
                </span>
                <span className="text-muted-foreground block truncate font-mono text-[0.6875rem]">
                  {audit.userAgent}
                </span>
              </div>
            )}
          </div>

          {/* Reason if provided */}
          {audit.reason && (
            <div className="border-line space-y-1 rounded-lg border p-4">
              <span className="text-caption text-muted-foreground font-semibold uppercase">
                Staff Reason / Justification
              </span>
              <p className="text-ink">{audit.reason}</p>
            </div>
          )}

          {/* Before & After Diffs */}
          <div className="space-y-3">
            <h3 className="text-ink flex items-center justify-between font-semibold">
              <span>Field Changes</span>
              <span className="text-caption text-muted-foreground font-normal">
                {audit.diffs.length} field{audit.diffs.length === 1 ? '' : 's'}{' '}
                modified
              </span>
            </h3>

            {audit.diffs.length === 0 ? (
              <div className="border-line text-caption text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                No state diff recorded for this operation.
              </div>
            ) : (
              <div className="space-y-2">
                {audit.diffs.map((diff) => (
                  <div
                    key={diff.field}
                    className="border-line bg-card space-y-2 rounded-lg border p-3"
                  >
                    <div className="text-ink text-caption font-semibold">
                      {diff.label}
                    </div>
                    <div className="text-caption grid grid-cols-2 gap-2 font-mono">
                      <div className="bg-destructive/5 border-destructive/20 text-destructive rounded border p-2 wrap-break-word">
                        <span className="text-muted-foreground mb-0.5 block text-[0.625rem] font-bold uppercase">
                          Before:
                        </span>
                        {diff.before}
                      </div>
                      <div className="bg-success/5 border-success/20 text-success rounded border p-2 wrap-break-word">
                        <span className="text-muted-foreground mb-0.5 block text-[0.625rem] font-bold uppercase">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
