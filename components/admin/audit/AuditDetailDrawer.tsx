'use client';

import Link from 'next/link';
import { ExternalLink, ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!audit) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-surface border-line relative flex h-full w-full max-w-xl flex-col border-l shadow-2xl">
        {/* Header */}
        <div className="border-line flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h3 font-display text-ink font-semibold">
                Audit Log Entry
              </h2>
              <span className="text-caption bg-paper border-line rounded border px-2 py-0.5 font-mono capitalize">
                {audit.action}
              </span>
            </div>
            <p className="text-caption text-muted mt-0.5 font-mono">
              {audit.entity} • ID: {audit.entityId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:bg-paper hover:text-ink rounded-full p-2"
            aria-label="Close audit detail drawer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {/* Metadata Grid */}
          <div className="border-line bg-paper/50 text-caption grid grid-cols-2 gap-3 rounded-lg border p-4">
            <div>
              <span className="text-muted block">Timestamp (Hotel Local)</span>
              <span className="text-ink font-medium">
                {new Date(audit.createdAt).toLocaleString('en-GB', {
                  timeZone: 'Africa/Lagos',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div>
              <span className="text-muted block">Timestamp (UTC)</span>
              <span className="text-ink font-mono">{audit.utcTime}</span>
            </div>
            <div>
              <span className="text-muted block">Actor</span>
              <span className="text-ink font-medium">
                {audit.actorName} ({audit.actorRole})
              </span>
            </div>
            <div>
              <span className="text-muted block">Linked Entity</span>
              {audit.entityLink && audit.isEntityAvailable ? (
                <Link
                  href={audit.entityLink}
                  className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
                >
                  <span>{audit.entityRef || audit.entityId}</span>
                  <ExternalLink className="size-3" />
                </Link>
              ) : (
                <span className="text-muted italic">
                  {audit.entityRef || audit.entityId} (No longer available)
                </span>
              )}
            </div>

            {isOwner && audit.ipAddress && (
              <div>
                <span className="text-muted block">
                  IP Address (Owner Only)
                </span>
                <span className="text-ink font-mono">{audit.ipAddress}</span>
              </div>
            )}
            {isOwner && audit.userAgent && (
              <div className="col-span-2">
                <span className="text-muted block">
                  User Agent (Owner Only)
                </span>
                <span className="text-muted block truncate font-mono text-[11px]">
                  {audit.userAgent}
                </span>
              </div>
            )}
          </div>

          {/* Reason if provided */}
          {audit.reason && (
            <div className="border-line space-y-1 rounded-lg border p-4">
              <span className="text-caption text-muted font-semibold uppercase">
                Staff Reason / Justification
              </span>
              <p className="text-ink">{audit.reason}</p>
            </div>
          )}

          {/* Before & After Diffs */}
          <div className="space-y-3">
            <h3 className="text-ink flex items-center justify-between font-semibold">
              <span>Field Changes</span>
              <span className="text-caption text-muted font-normal">
                {audit.diffs.length} field{audit.diffs.length === 1 ? '' : 's'}{' '}
                modified
              </span>
            </h3>

            {audit.diffs.length === 0 ? (
              <div className="border-line text-caption text-muted rounded-lg border border-dashed p-4 text-center">
                No state diff recorded for this operation.
              </div>
            ) : (
              <div className="space-y-2">
                {audit.diffs.map((diff) => (
                  <div
                    key={diff.field}
                    className="border-line bg-surface space-y-2 rounded-lg border p-3"
                  >
                    <div className="text-ink text-caption font-semibold">
                      {diff.label}
                    </div>
                    <div className="text-caption grid grid-cols-2 gap-2 font-mono">
                      <div className="bg-danger/5 border-danger/20 text-danger rounded border p-2 break-words">
                        <span className="text-muted mb-0.5 block text-[10px] font-bold uppercase">
                          Before:
                        </span>
                        {diff.before}
                      </div>
                      <div className="bg-success/5 border-success/20 text-success rounded border p-2 break-words">
                        <span className="text-muted mb-0.5 block text-[10px] font-bold uppercase">
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

          {/* Log Immutability note */}
          <div className="border-line bg-paper text-caption text-muted flex items-start gap-2 rounded-lg border p-3">
            <ShieldCheck className="text-success mt-0.5 size-4 shrink-0" />
            <span>
              This log entry is permanent and cannot be modified or deleted by
              any administrative account.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-line bg-paper flex justify-end border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="border-line bg-surface text-small text-ink hover:bg-paper rounded-md border px-4 py-2 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
