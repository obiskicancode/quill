'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type {
  ManualRefundItem,
  ManualRefundPayoutInput,
} from '@/types/payments-admin.types';

function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function generatePayoutReference(): string {
  return `REF-TRF-${Date.now().toString().slice(-6)}`;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ManualRefundsTab({
  refunds,
  loading = false,
  onMarkPaidOut,
  onRecheckProvider,
}: {
  refunds: ManualRefundItem[];
  loading?: boolean;
  onMarkPaidOut: (id: string, input: ManualRefundPayoutInput) => Promise<void>;
  onRecheckProvider: (id: string) => Promise<string>;
}) {
  const [selectedRefund, setSelectedRefund] = useState<ManualRefundItem | null>(
    null,
  );
  const [payoutForm, setPayoutForm] = useState<{
    amountNaira: string;
    method: 'bank_transfer' | 'cash';
    reference: string;
    paidDate: string;
    doNotEmailGuest: boolean;
    note: string;
  }>(() => ({
    amountNaira: '',
    method: 'bank_transfer',
    reference: '',
    paidDate: '',
    doNotEmailGuest: false,
    note: '',
  }));

  const [submitting, setSubmitting] = useState(false);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [recheckFeedback, setRecheckFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenPayout = (refund: ManualRefundItem) => {
    setSelectedRefund(refund);
    setPayoutForm({
      amountNaira: String(refund.refundDueMinor / 100),
      method: refund.method === 'cash' ? 'cash' : 'bank_transfer',
      reference: generatePayoutReference(),
      paidDate: getTodayDateString(),
      doNotEmailGuest: false,
      note: `Manual refund paid out for ${refund.guestName}`,
    });
    setFormError(null);
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;

    const amountMinor = Math.round(Number(payoutForm.amountNaira) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setFormError('Please enter a valid payout amount.');
      return;
    }
    if (amountMinor > selectedRefund.refundDueMinor) {
      setFormError(
        `Payout amount cannot exceed refund amount due (${formatNaira(selectedRefund.refundDueMinor)})`,
      );
      return;
    }

    try {
      setSubmitting(true);
      await onMarkPaidOut(selectedRefund.id, {
        amountMinor,
        method: payoutForm.method,
        reference: payoutForm.reference,
        paidDate: payoutForm.paidDate,
        idempotencyKey: `payout-${selectedRefund.id}-${Date.now()}`,
        doNotEmailGuest: payoutForm.doNotEmailGuest,
        note: payoutForm.note,
      });
      setSelectedRefund(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to record refund payout';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecheck = async (id: string) => {
    setRecheckingId(id);
    setRecheckFeedback(null);
    try {
      const msg = await onRecheckProvider(id);
      setRecheckFeedback(msg);
    } catch {
      setRecheckFeedback('Could not reach gateway status API.');
    } finally {
      setRecheckingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-card border-line bg-card text-muted-foreground border p-8 text-center">
        Loading pending refunds...
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className="rounded-card border-line bg-paper border border-dashed p-8 text-center">
        <CheckCircle2 className="text-success mx-auto mb-2 size-8" />
        <h3 className="text-ink font-semibold">All Refunds Up to Date</h3>
        <p className="text-small text-muted-foreground mt-1">
          There are no pending manual or provider refunds awaiting action.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recheckFeedback && (
        <div className="border-line bg-paper text-caption text-ink flex items-center justify-between rounded-md border p-3">
          <span>{recheckFeedback}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRecheckFeedback(null)}
            className="text-muted-foreground hover:text-foreground size-6 p-0 hover:bg-transparent"
            aria-label="Dismiss notice"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="rounded-card border-line bg-card overflow-x-auto border">
        <Table className="text-small w-full text-left">
          <TableHeader className="border-line bg-paper text-caption text-muted-foreground border-b font-semibold uppercase">
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="px-4 py-3">Booking Ref</TableHead>
              <TableHead className="px-4 py-3">Guest Name</TableHead>
              <TableHead className="px-4 py-3">Refund Due (₦)</TableHead>
              <TableHead className="px-4 py-3">Provider / Channel</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-line divide-y">
            {refunds.map((refund) => {
              const isManual =
                refund.provider === 'bank_transfer' ||
                refund.provider === 'cash';

              return (
                <TableRow
                  key={refund.id}
                  className="hover:bg-paper/50 border-line"
                >
                  <TableCell className="text-ink px-4 py-3 font-mono font-medium">
                    <Link
                      href={`/admin/reservations/${refund.reservationId}`}
                      className="hover:text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      {refund.reservationRef}{' '}
                      <ExternalLink className="text-muted-foreground size-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="text-ink font-medium">
                      {refund.guestName}
                    </div>
                    <div className="text-caption text-muted-foreground">
                      {refund.guestEmail}
                    </div>
                  </TableCell>
                  <TableCell className="text-destructive px-4 py-3 font-mono font-bold">
                    {formatNaira(refund.refundDueMinor)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-ink font-medium capitalize">
                      {refund.provider}
                    </span>
                    <span className="text-caption text-muted-foreground block capitalize">
                      {refund.method.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="text-caption border-primary/30 bg-primary/15 text-brand-ink font-medium"
                    >
                      {isManual
                        ? 'Manual Payout Due'
                        : refund.providerState || 'Processing at Gateway'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {isManual ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenPayout(refund)}
                      >
                        Mark as Paid Out
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecheck(refund.id)}
                        disabled={recheckingId === refund.id}
                        className="gap-1.5"
                      >
                        <RefreshCw
                          className={`size-3.5 ${recheckingId === refund.id ? 'animate-spin' : ''}`}
                        />
                        Re-check Status
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedRefund && (
        <Dialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !submitting) setSelectedRefund(null);
          }}
        >
          <DialogContent className="rounded-card border-line bg-card max-w-lg gap-0 border p-0 shadow-xl sm:max-w-lg">
            <DialogHeader className="border-line border-b p-6 pr-14 pb-3">
              <DialogTitle className="font-display text-h3 text-ink font-semibold">
                Record Manual Refund Payout
              </DialogTitle>
              <DialogDescription className="text-caption text-muted-foreground">
                Record the offline payout details for this refund.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmitPayout}
              className="text-small space-y-4 p-6"
            >
              <div className="bg-paper border-line text-caption text-muted-foreground space-y-1 rounded-lg border p-3">
                <div>
                  Booking:{' '}
                  <strong className="text-ink font-mono">
                    {selectedRefund.reservationRef}
                  </strong>
                </div>
                <div>
                  Guest:{' '}
                  <strong className="text-ink">
                    {selectedRefund.guestName}
                  </strong>{' '}
                  ({selectedRefund.guestEmail})
                </div>
                <div>
                  Total refund due:{' '}
                  <strong className="text-destructive font-mono font-bold">
                    {formatNaira(selectedRefund.refundDueMinor)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="payout-amount" className="text-caption">
                    Amount Paid Out (₦)
                  </Label>
                  <Input
                    id="payout-amount"
                    type="number"
                    step="any"
                    required
                    value={payoutForm.amountNaira}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        amountNaira: e.target.value,
                      })
                    }
                    className="border-line bg-paper font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payout-method" className="text-caption">
                    Payout Method
                  </Label>
                  <Select
                    items={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'cash', label: 'Cash' },
                    ]}
                    value={payoutForm.method}
                    onValueChange={(val) => {
                      if (val) {
                        setPayoutForm({
                          ...payoutForm,
                          method: val as 'bank_transfer' | 'cash',
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="payout-method" className="w-full">
                      <SelectValue placeholder="Select payout method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="payout-reference" className="text-caption">
                    Payout Reference / Narration
                  </Label>
                  <Input
                    id="payout-reference"
                    type="text"
                    required
                    value={payoutForm.reference}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        reference: e.target.value,
                      })
                    }
                    className="border-line bg-paper"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payout-date" className="text-caption">
                    Date Paid
                  </Label>
                  <Input
                    id="payout-date"
                    type="date"
                    required
                    value={payoutForm.paidDate}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, paidDate: e.target.value })
                    }
                    className="border-line bg-paper"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payout-note" className="text-caption">
                  Internal Note
                </Label>
                <Textarea
                  id="payout-note"
                  rows={2}
                  value={payoutForm.note}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, note: e.target.value })
                  }
                  className="border-line bg-paper"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="doNotEmailGuest"
                  checked={payoutForm.doNotEmailGuest}
                  onCheckedChange={(checked) =>
                    setPayoutForm({
                      ...payoutForm,
                      doNotEmailGuest: !!checked,
                    })
                  }
                />
                <Label
                  htmlFor="doNotEmailGuest"
                  className="cursor-pointer font-normal"
                >
                  Do not email the guest about this refund (internal / offline
                  handled)
                </Label>
              </div>

              {formError && (
                <Alert
                  variant="destructive"
                  className="border-destructive/30 bg-destructive/5 text-caption text-destructive"
                >
                  {formError}
                </Alert>
              )}

              <DialogFooter className="border-line border-t bg-transparent px-0 pb-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRefund(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Confirm Paid Out
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
