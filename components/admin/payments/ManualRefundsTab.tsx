'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, inputClass } from '@/components/ui/form-field';
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
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatMinorExact } from '@/lib/format';
import { ManualRefundPayoutInputSchema } from '@/schemas/payments.schema';
import type {
  ManualRefundItem,
  ManualRefundPayoutInput,
} from '@/types/payments.types';

const ManualRefundPayoutFormSchema = ManualRefundPayoutInputSchema.omit({
  amountMinor: true,
  idempotencyKey: true,
})
  .extend({
    amountNaira: z
      .string()
      .trim()
      .min(1, ERROR_MESSAGES.VALID_PAYOUT_AMOUNT)
      .refine((value) => {
        const amountMinor = Math.round(Number(value) * 100);
        return Number.isFinite(amountMinor) && amountMinor > 0;
      }, ERROR_MESSAGES.VALID_PAYOUT_AMOUNT)
      .transform((value) => Math.round(Number(value) * 100)),
  })
  .transform(({ amountNaira, ...rest }) => ({
    ...rest,
    amountMinor: amountNaira,
  }));

type PayoutInput = z.input<typeof ManualRefundPayoutFormSchema>;
type PayoutOutput = z.output<typeof ManualRefundPayoutFormSchema>;

function generatePayoutReference(): string {
  return `REF-TRF-${Date.now().toString().slice(-6)}`;
}

function generatePayoutIdempotencyKey(id: string): string {
  return `payout-${id}-${Date.now()}`;
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
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PayoutInput, unknown, PayoutOutput>({
    resolver: zodResolver(ManualRefundPayoutFormSchema),
    defaultValues: {
      amountNaira: '',
      method: 'bank_transfer',
      reference: '',
      paidDate: '',
      doNotEmailGuest: false,
      note: '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError: setFieldError,
  } = form;

  const handleOpenPayout = (refund: ManualRefundItem) => {
    setSelectedRefund(refund);
    reset({
      amountNaira: String(refund.refundDueMinor / 100),
      method: refund.method === 'cash' ? 'cash' : 'bank_transfer',
      reference: generatePayoutReference(),
      paidDate: getTodayDateString(),
      doNotEmailGuest: false,
      note: `Manual refund paid out for ${refund.guestName}`,
    });
    setFormError(null);
  };

  const handleSubmitPayout = async (input: PayoutOutput) => {
    if (!selectedRefund) return;

    if (input.amountMinor > selectedRefund.refundDueMinor) {
      setFormError(
        ERROR_MESSAGES.PAYOUT_EXCEEDS_REFUND_DUE_SIMPLE(
          selectedRefund.refundDueMinor,
        ),
      );
      return;
    }

    setFormError(null);
    try {
      await onMarkPaidOut(selectedRefund.id, {
        ...input,
        idempotencyKey: generatePayoutIdempotencyKey(selectedRefund.id),
      });
      toast.add({
        title: SUCCESS_MESSAGES.REFUND_PAYOUT_MARKED_PAID,
        type: 'success',
      });
      setSelectedRefund(null);
    } catch (err: unknown) {
      if (err instanceof ServiceError) {
        const fieldErrors = err.body?.fieldErrors;
        if (fieldErrors) {
          for (const [field, message] of Object.entries(fieldErrors)) {
            if (!message) continue;
            const fieldName = field === 'amountMinor' ? 'amountNaira' : field;
            setFieldError(fieldName as keyof PayoutInput, {
              type: 'server',
              message,
            });
          }
        }
        setFormError(err.message);
      } else {
        setFormError(
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_RECORD_REFUND_PAYOUT,
        );
      }
    }
  };

  const handleRecheck = async (id: string) => {
    setRecheckingId(id);
    try {
      const msg = await onRecheckProvider(id);
      toast.add({ title: msg, type: 'success' });
    } catch {
      toast.add({
        title: ERROR_MESSAGES.COULD_NOT_REACH_GATEWAY,
        type: 'error',
        priority: 'high',
      });
    } finally {
      setRecheckingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-card border border-line bg-card p-8 text-center text-muted-foreground">
        Loading pending refunds...
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-paper p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-8 text-success" />
        <h3 className="font-semibold text-ink">All Refunds Up to Date</h3>
        <p className="mt-1 text-small text-muted-foreground">
          There are no pending manual or provider refunds awaiting action.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-card border border-line bg-card">
        <Table className="w-full text-left text-small">
          <TableHeader className="border-b border-line bg-paper text-caption font-semibold text-muted-foreground uppercase">
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="px-4 py-3">Booking Ref</TableHead>
              <TableHead className="px-4 py-3">Guest Name</TableHead>
              <TableHead className="px-4 py-3">Refund Due (₦)</TableHead>
              <TableHead className="px-4 py-3">Provider / Channel</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-line">
            {refunds.map((refund) => {
              const isManual =
                refund.provider === 'bank_transfer' ||
                refund.provider === 'cash';

              return (
                <TableRow
                  key={refund.id}
                  className="border-line hover:bg-paper/50"
                >
                  <TableCell className="px-4 py-3 font-mono font-medium text-ink">
                    <Link
                      href={`/admin/reservations/${refund.reservationId}`}
                      className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline"
                    >
                      {refund.reservationRef}{' '}
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="font-medium text-ink">
                      {refund.guestName}
                    </div>
                    <div className="text-caption text-muted-foreground">
                      {refund.guestEmail}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono font-bold text-destructive">
                    {formatMinorExact(refund.refundDueMinor)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="font-medium text-ink capitalize">
                      {refund.provider}
                    </span>
                    <span className="block text-caption text-muted-foreground capitalize">
                      {refund.method.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="brand">
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
                        variant="secondary"
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
            if (!nextOpen && !isSubmitting) setSelectedRefund(null);
          }}
        >
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>Record Manual Refund Payout</DialogTitle>
              <DialogDescription>
                Record the offline payout details for this refund.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit(handleSubmitPayout)}
              className="flex min-h-0 flex-1 flex-col"
              noValidate
            >
              <DialogBody className="space-y-4">
                <div className="space-y-1 rounded-control border border-line bg-paper p-3 text-caption text-muted-foreground">
                  <div>
                    Booking:{' '}
                    <strong className="font-mono text-ink">
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
                    <strong className="font-mono font-bold text-destructive">
                      {formatMinorExact(selectedRefund.refundDueMinor)}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    id="payout-amount"
                    label="Amount Paid Out (₦)"
                    error={errors.amountNaira?.message}
                  >
                    {(a11y) => (
                      <Input
                        {...a11y}
                        {...register('amountNaira')}
                        type="number"
                        step="any"
                        required
                        className={`${inputClass(errors.amountNaira?.message)} border-line bg-paper font-mono`}
                      />
                    )}
                  </Field>

                  <Field
                    id="payout-method"
                    label="Payout Method"
                    error={errors.method?.message}
                  >
                    {(a11y) => (
                      <Controller
                        control={control}
                        name="method"
                        render={({ field }) => (
                          <Select
                            items={[
                              {
                                value: 'bank_transfer',
                                label: 'Bank Transfer',
                              },
                              { value: 'cash', label: 'Cash' },
                            ]}
                            value={field.value}
                            onValueChange={(val) => {
                              if (val) field.onChange(val);
                            }}
                          >
                            <SelectTrigger
                              id={a11y.id}
                              aria-describedby={a11y['aria-describedby']}
                              aria-invalid={a11y['aria-invalid']}
                              onBlur={field.onBlur}
                              className="w-full"
                            >
                              <SelectValue placeholder="Select payout method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank_transfer">
                                Bank Transfer
                              </SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    id="payout-reference"
                    label="Payout Reference / Narration"
                    error={errors.reference?.message}
                  >
                    {(a11y) => (
                      <Input
                        {...a11y}
                        {...register('reference')}
                        type="text"
                        required
                        className={`${inputClass(errors.reference?.message)} border-line bg-paper`}
                      />
                    )}
                  </Field>

                  <Field
                    id="payout-date"
                    label="Date Paid"
                    error={errors.paidDate?.message}
                  >
                    {(a11y) => (
                      <Input
                        {...a11y}
                        {...register('paidDate')}
                        type="date"
                        required
                        className={`${inputClass(errors.paidDate?.message)} border-line bg-paper`}
                      />
                    )}
                  </Field>
                </div>

                <Field
                  id="payout-note"
                  label="Internal Note"
                  optional
                  error={errors.note?.message}
                >
                  {(a11y) => (
                    <Textarea
                      {...a11y}
                      {...register('note')}
                      rows={2}
                      className={`${inputClass(errors.note?.message)} border-line bg-paper`}
                    />
                  )}
                </Field>

                <div className="flex items-center gap-2 pt-1">
                  <Controller
                    control={control}
                    name="doNotEmailGuest"
                    render={({ field }) => (
                      <Checkbox
                        id="doNotEmailGuest"
                        name={field.name}
                        ref={field.ref}
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        onBlur={field.onBlur}
                      />
                    )}
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
                  <Alert variant="destructive" size="sm">
                    {formError}
                  </Alert>
                )}
              </DialogBody>

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedRefund(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
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
