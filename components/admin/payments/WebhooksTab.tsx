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
import type { WebhookEventItem } from '@/types/payments.types';

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
      <div className="rounded-card border-line bg-card text-muted-foreground border p-8 text-center">
        Loading gateway webhook events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-card border-line bg-paper text-muted-foreground border border-dashed p-8 text-center">
        No webhook events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-caption text-muted-foreground flex items-center justify-between">
        <span>Payment Gateway Webhook Feed</span>
        <span>Highlighting events unprocessed for &gt; 10 minutes</span>
      </div>

      <div className="rounded-card border-line bg-card overflow-x-auto border">
        <Table className="text-small w-full text-left">
          <TableHeader className="border-line bg-paper text-caption text-muted-foreground border-b font-semibold uppercase">
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="px-4 py-3">Received</TableHead>
              <TableHead className="px-4 py-3">Provider</TableHead>
              <TableHead className="px-4 py-3">Event Type</TableHead>
              <TableHead className="px-4 py-3">Event ID</TableHead>
              <TableHead className="px-4 py-3">State</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-line divide-y">
            {events.map((evt) => {
              const isExpanded = expandedId === evt.id;

              return (
                <TableRow
                  key={evt.id}
                  className={`border-line transition-colors ${
                    evt.isOverdue ? 'bg-primary/5' : 'hover:bg-paper/50'
                  }`}
                >
                  <TableCell className="text-caption text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {new Date(evt.receivedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-ink px-4 py-3 font-medium capitalize">
                    {evt.provider}
                  </TableCell>
                  <TableCell className="text-caption text-ink px-4 py-3 font-mono">
                    {evt.eventType || 'unknown'}
                  </TableCell>
                  <TableCell className="text-caption text-muted-foreground px-4 py-3 font-mono">
                    {evt.eventId}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {evt.processed ? (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-caption text-success border-success/20 inline-flex items-center gap-1 font-medium"
                      >
                        <CheckCircle2 className="size-3.5" /> Processed
                      </Badge>
                    ) : evt.isOverdue ? (
                      <Badge
                        variant="outline"
                        className="bg-destructive/10 text-caption text-destructive border-destructive/20 inline-flex items-center gap-1 font-semibold"
                      >
                        <AlertTriangle className="size-3.5" /> Overdue (&gt;10m)
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-caption border-primary/30 bg-primary/15 text-brand-ink font-medium"
                      >
                        Pending
                      </Badge>
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
                        className="text-caption text-muted-foreground hover:text-ink font-medium"
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
        <div className="rounded-card border-line bg-ink text-paper overflow-x-auto border p-4 font-mono text-[0.6875rem]">
          <div className="border-paper/20 mb-2 flex items-center justify-between border-b pb-2">
            <span className="text-muted-foreground text-[0.625rem] font-semibold uppercase">
              Masked Webhook Payload
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExpandedId(null)}
              className="text-muted-foreground size-6 p-0 hover:bg-transparent hover:text-white"
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
