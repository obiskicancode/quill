'use client';

import { AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatHotelTimeWithSeconds } from '@/lib/format';
import type { WebhookEventItem } from '@/types/payments.types';

/** Webhook event log with processing state and owner-only reprocessing. */
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
      toast.add({
        title: SUCCESS_MESSAGES.WEBHOOK_REPROCESSED,
        type: 'success',
      });
    } catch (err: unknown) {
      toast.add({
        title:
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.WEBHOOK_PROCESSING_FAILED,
        type: 'error',
        priority: 'high',
      });
    } finally {
      setReprocessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-card border border-line bg-card p-8 text-center text-muted-foreground">
        Loading gateway webhook events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-paper p-8 text-center text-muted-foreground">
        No webhook events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span>Payment Gateway Webhook Feed</span>
        <span>Highlighting events unprocessed for &gt; 10 minutes</span>
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-card">
        <Table className="w-full text-left text-small">
          <TableHeader className="border-b border-line bg-paper text-caption font-semibold text-muted-foreground uppercase">
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="px-4 py-3">Received</TableHead>
              <TableHead className="px-4 py-3">Provider</TableHead>
              <TableHead className="px-4 py-3">Event Type</TableHead>
              <TableHead className="px-4 py-3">Event ID</TableHead>
              <TableHead className="px-4 py-3">State</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-line">
            {events.map((evt) => {
              const isExpanded = expandedId === evt.id;

              return (
                <TableRow
                  key={evt.id}
                  className={`border-line transition-colors ${
                    evt.isOverdue ? 'bg-primary/5' : 'hover:bg-paper/50'
                  }`}
                >
                  <TableCell className="px-4 py-3 text-caption whitespace-nowrap text-muted-foreground">
                    {formatHotelTimeWithSeconds(evt.receivedAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium text-ink capitalize">
                    {evt.provider}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-caption text-ink">
                    {evt.eventType || 'unknown'}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-caption text-muted-foreground">
                    {evt.eventId}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {evt.processed ? (
                      <Badge variant="success">
                        <CheckCircle2 /> Processed
                      </Badge>
                    ) : evt.isOverdue ? (
                      <Badge variant="destructive">
                        <AlertTriangle /> Overdue (&gt;10m)
                      </Badge>
                    ) : (
                      <Badge variant="brand">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 px-4 py-3 text-right">
                    {isOwner && evt.payloadMasked && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : evt.id)
                        }
                        className="text-caption font-medium text-muted-foreground hover:text-ink"
                      >
                        {isExpanded ? 'Hide Payload' : 'View Payload'}
                      </Button>
                    )}

                    {!evt.processed && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReprocess(evt.id)}
                        disabled={reprocessingId === evt.id}
                        className="gap-1"
                      >
                        <RefreshCw
                          className={`size-3 ${reprocessingId === evt.id ? 'animate-spin' : ''}`}
                        />
                        Reprocess
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Expanded payload drawer/block for owner */}
      {expandedId && (
        <div className="overflow-x-auto rounded-card border border-line bg-ink p-4 font-mono text-micro text-paper">
          <div className="mb-2 flex items-center justify-between border-b border-paper/20 pb-2">
            <span className="text-micro font-semibold text-muted-foreground uppercase">
              Masked Webhook Payload
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExpandedId(null)}
              className="size-6 p-0 text-muted-foreground hover:bg-transparent hover:text-white"
              aria-label="Close payload view"
            >
              <X className="size-4" />
            </Button>
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
