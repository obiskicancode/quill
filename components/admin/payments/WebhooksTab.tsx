'use client';

import { AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

import type { WebhookEventItem } from '@/types/payments-admin.types';

export function WebhooksTab({
  events,
  loading = false,
  onReprocess,
  isOwner = false,
}: {
  events: WebhookEventItem[];
  loading?: boolean;
  onReprocess: (id: string) => Promise<void>;
  isOwner?: boolean;
}) {
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    try {
      await onReprocess(id);
    } finally {
      setReprocessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-card border-line bg-surface text-muted border p-8 text-center">
        Loading gateway webhook events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-card border-line bg-paper text-muted border border-dashed p-8 text-center">
        No webhook events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-caption text-muted flex items-center justify-between">
        <span>Payment Gateway Webhook Feed</span>
        <span>Highlighting events unprocessed for &gt; 10 minutes</span>
      </div>

      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        <table className="text-small w-full text-left">
          <thead className="border-line bg-paper text-caption text-muted border-b font-semibold uppercase">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3">Event ID</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {events.map((evt) => {
              const isExpanded = expandedId === evt.id;

              return (
                <tr
                  key={evt.id}
                  className={`transition-colors ${
                    evt.isOverdue ? 'bg-amber-500/5' : 'hover:bg-paper/50'
                  }`}
                >
                  <td className="text-caption text-muted px-4 py-3 whitespace-nowrap">
                    {new Date(evt.receivedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="text-ink px-4 py-3 font-medium capitalize">
                    {evt.provider}
                  </td>
                  <td className="text-caption text-ink px-4 py-3 font-mono">
                    {evt.eventType || 'unknown'}
                  </td>
                  <td className="text-caption text-muted px-4 py-3 font-mono">
                    {evt.eventId}
                  </td>
                  <td className="px-4 py-3">
                    {evt.processed ? (
                      <span className="bg-success/10 text-caption text-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium">
                        <CheckCircle2 className="size-3.5" /> Processed
                      </span>
                    ) : evt.isOverdue ? (
                      <span className="bg-danger/10 text-caption text-danger border-danger/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold">
                        <AlertTriangle className="size-3.5" /> Overdue (&gt;10m)
                      </span>
                    ) : (
                      <span className="text-caption inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    {isOwner && evt.payloadMasked && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : evt.id)
                        }
                        className="text-caption text-muted hover:text-ink font-medium"
                      >
                        {isExpanded ? 'Hide Payload' : 'View Payload'}
                      </button>
                    )}

                    {!evt.processed && (
                      <button
                        type="button"
                        onClick={() => handleReprocess(evt.id)}
                        disabled={reprocessingId === evt.id}
                        className="bg-primary text-caption text-primary-ink inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold hover:opacity-95"
                      >
                        <RefreshCw
                          className={`size-3 ${reprocessingId === evt.id ? 'animate-spin' : ''}`}
                        />
                        Reprocess
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded payload drawer/block for owner */}
      {expandedId && (
        <div className="rounded-card border-line bg-ink text-paper overflow-x-auto border p-4 font-mono text-[11px]">
          <div className="border-paper/20 mb-2 flex items-center justify-between border-b pb-2">
            <span className="text-muted text-[10px] font-semibold uppercase">
              Masked Webhook Payload
            </span>
            <button
              type="button"
              onClick={() => setExpandedId(null)}
              className="text-muted hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <pre>
            {JSON.stringify(
              events.find((e) => e.id === expandedId)?.payloadMasked || {},
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
