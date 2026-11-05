import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { db } from '@/db';
import {
  payments,
  paymentWebhookEvents,
  refunds,
  reservations,
  reservationStatusHistory,
  roomTypes,
  staffUsers,
} from '@/db/schema';
import { completeOnlinePayment } from '@/lib/booking/store';
import { formatWeekdayDay } from '@/lib/dates';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { formatMinor } from '@/lib/format';
import { sendRefundIssuedEmail } from '@/lib/mail';
import { createPaymentProvider as getPaymentProvider } from '@/lib/payments/factory';
import { isPaymentProviderId } from '@/lib/payments/provider';
import {
  computePaymentSummary,
  unreconcilePayment as unreconcilePaymentHelper,
  validateManualRefundPayout,
} from '@/lib/payments/reconciliation';
import { applyStoredWebhookEvent } from '@/lib/payments/webhook';
import { recomputeReservationFinancials } from '@/lib/reservations/payment-ledger';
import type {
  DailyPaymentStripItem,
  ManualRefundItem,
  ManualRefundPayoutInput,
  PaymentBreakdownItem,
  PaymentDetailResponse,
  PaymentListItem,
  PaymentsBreakdownResponse,
  PaymentsQueryParams,
  PaymentSummaryResponse,
  WebhookEventItem,
  WebhookEventsQueryParams,
} from '@/types/payments.types';

function resolveMethod(
  channel: string | null,
  provider: string,
): 'card' | 'ussd' | 'bank_transfer' | 'cash' {
  if (
    channel === 'cash' ||
    channel === 'bank_transfer' ||
    channel === 'card' ||
    channel === 'ussd'
  ) {
    return channel;
  }
  if (provider === 'cash') return 'cash';
  if (provider === 'bank_transfer') return 'bank_transfer';
  return 'card';
}

function resolveRefundMethod(
  channel: string | null,
  provider: string,
): 'card' | 'bank_transfer' | 'cash' {
  if (channel === 'cash' || channel === 'bank_transfer' || channel === 'card') {
    return channel;
  }
  if (provider === 'cash') return 'cash';
  if (provider === 'bank_transfer') return 'bank_transfer';
  return 'card';
}

export async function getPaymentsSummary(
  from: string,
  to: string,
): Promise<PaymentSummaryResponse> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const durationMs = Math.max(
    toDate.getTime() - fromDate.getTime(),
    24 * 60 * 60 * 1000,
  );
  const prevFromDate = new Date(fromDate.getTime() - durationMs);
  const prevToDate = fromDate;

  // Current period payments
  const currentList = await db
    .select()
    .from(payments)
    .where(
      and(
        sql`${payments.createdAt} >= ${fromDate.toISOString()}::timestamptz`,
        sql`${payments.createdAt} <= ${toDate.toISOString()}::timestamptz`,
      ),
    );

  // Previous period payments for delta comparison
  const previousList = await db
    .select()
    .from(payments)
    .where(
      and(
        sql`${payments.createdAt} >= ${prevFromDate.toISOString()}::timestamptz`,
        sql`${payments.createdAt} < ${prevToDate.toISOString()}::timestamptz`,
      ),
    );

  return computePaymentSummary({
    currentPayments: currentList.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      method: resolveMethod(p.channel, p.provider),
      provider: p.provider,
      amountMinor: p.amountMinor,
      reconciled: p.reconciled,
      reconciledAt: p.reconciledAt,
      reconciledBy: p.reconciledBy,
      note: p.note,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    previousPayments: previousList.map((p) => ({
      id: p.id,
      type: p.type as 'deposit' | 'balance' | 'full' | 'refund',
      status: p.status as 'pending' | 'paid' | 'failed' | 'refunded',
      method: resolveMethod(p.channel, p.provider),
      provider: p.provider,
      amountMinor: p.amountMinor,
      reconciled: p.reconciled,
      reconciledAt: p.reconciledAt,
      reconciledBy: p.reconciledBy,
      note: p.note,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    range: { from, to, label: 'Selected Range' },
  });
}

export async function getPaymentsBreakdown(
  from?: string,
  to?: string,
): Promise<PaymentsBreakdownResponse> {
  const fromDate = from
    ? new Date(from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const list = await db
    .select()
    .from(payments)
    .where(
      and(
        sql`${payments.createdAt} >= ${fromDate.toISOString()}::timestamptz`,
        sql`${payments.createdAt} <= ${toDate.toISOString()}::timestamptz`,
      ),
    );

  let totalCollectedMinor = 0;
  const methodMap: Record<string, { count: number; amountMinor: number }> = {
    card: { count: 0, amountMinor: 0 },
    bank_transfer: { count: 0, amountMinor: 0 },
    cash: { count: 0, amountMinor: 0 },
    ussd: { count: 0, amountMinor: 0 },
  };

  const providerMap: Record<string, { count: number; amountMinor: number }> = {
    paystack: { count: 0, amountMinor: 0 },
    flutterwave: { count: 0, amountMinor: 0 },
    stripe: { count: 0, amountMinor: 0 },
    bank_transfer: { count: 0, amountMinor: 0 },
    cash: { count: 0, amountMinor: 0 },
  };

  const dayMap: Record<string, { collectedMinor: number; count: number }> = {};

  for (const p of list) {
    if (p.status === 'paid' && p.type !== 'refund') {
      totalCollectedMinor += p.amountMinor;

      const methodKey = p.channel || 'card';
      if (!methodMap[methodKey])
        methodMap[methodKey] = { count: 0, amountMinor: 0 };
      methodMap[methodKey].count += 1;
      methodMap[methodKey].amountMinor += p.amountMinor;

      const providerKey = p.provider;
      if (!providerMap[providerKey])
        providerMap[providerKey] = { count: 0, amountMinor: 0 };
      providerMap[providerKey].count += 1;
      providerMap[providerKey].amountMinor += p.amountMinor;

      const dateKey = p.createdAt.toISOString().slice(0, 10);
      if (!dayMap[dateKey]) dayMap[dateKey] = { collectedMinor: 0, count: 0 };
      dayMap[dateKey].collectedMinor += p.amountMinor;
      dayMap[dateKey].count += 1;
    }
  }

  const methodLabels: Record<string, string> = {
    card: 'Card (Online)',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash at Hotel',
    ussd: 'USSD',
  };

  const byMethod: PaymentBreakdownItem[] = Object.entries(methodMap).map(
    ([key, val]) => ({
      key,
      label: methodLabels[key] || key.replace('_', ' '),
      count: val.count,
      amountMinor: val.amountMinor,
      percent:
        totalCollectedMinor > 0
          ? Math.round((val.amountMinor / totalCollectedMinor) * 100)
          : 0,
    }),
  );

  const providerLabels: Record<string, string> = {
    paystack: 'Paystack',
    flutterwave: 'Flutterwave',
    stripe: 'Stripe',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash at Hotel',
  };

  const byProvider: PaymentBreakdownItem[] = Object.entries(providerMap).map(
    ([key, val]) => ({
      key,
      label: providerLabels[key] || key,
      count: val.count,
      amountMinor: val.amountMinor,
      percent:
        totalCollectedMinor > 0
          ? Math.round((val.amountMinor / totalCollectedMinor) * 100)
          : 0,
    }),
  );

  // Daily totals strip for last 7 dates
  const dailyStrip: DailyPaymentStripItem[] = [];
  const daysCount = 7;
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().slice(0, 10);
    const label = formatWeekdayDay(dateKey);
    const stat = dayMap[dateKey] || { collectedMinor: 0, count: 0 };
    dailyStrip.push({
      date: dateKey,
      label,
      collectedMinor: stat.collectedMinor,
      count: stat.count,
    });
  }

  return { byMethod, byProvider, dailyStrip };
}

export async function listPayments(params: PaymentsQueryParams): Promise<{
  items: PaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const conditions = [];

  if (params.status && params.status !== 'all') {
    conditions.push(sql`${payments.status}::text = ${params.status}`);
  }
  if (params.type && params.type !== 'all') {
    conditions.push(sql`${payments.type}::text = ${params.type}`);
  }
  if (params.provider && params.provider !== 'all') {
    conditions.push(sql`${payments.provider}::text = ${params.provider}`);
  }
  if (params.method && params.method !== 'all') {
    conditions.push(eq(payments.channel, params.method));
  }
  if (params.reconciled === 'yes') {
    conditions.push(eq(payments.reconciled, true));
  } else if (params.reconciled === 'no') {
    conditions.push(eq(payments.reconciled, false));
  }

  if (params.from) {
    const col =
      params.dateField === 'paid' ? payments.paidAt : payments.createdAt;
    conditions.push(sql`${col} >= ${params.from}::timestamptz`);
  }
  if (params.to) {
    const col =
      params.dateField === 'paid' ? payments.paidAt : payments.createdAt;
    conditions.push(sql`${col} <= ${params.to}::timestamptz`);
  }

  if (params.minAmount) {
    conditions.push(sql`${payments.amountMinor} >= ${params.minAmount * 100}`);
  }
  if (params.maxAmount) {
    conditions.push(sql`${payments.amountMinor} <= ${params.maxAmount * 100}`);
  }

  if (params.q) {
    conditions.push(
      or(
        ilike(payments.reference, `%${params.q}%`),
        ilike(payments.providerRef, `%${params.q}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(whereClause);

  const total = Number(countRes[0]?.count || 0);

  if (total === 0) {
    return {
      items: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: 0,
    };
  }

  const offset = (params.page - 1) * params.pageSize;
  const rows = await db
    .select({
      payment: payments,
      reservation: reservations,
      reconciledUser: staffUsers,
    })
    .from(payments)
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(staffUsers, eq(payments.reconciledBy, staffUsers.id))
    .where(whereClause)
    .orderBy(desc(payments.createdAt))
    .limit(params.pageSize)
    .offset(offset);

  const items: PaymentListItem[] = rows.map(
    ({ payment: p, reservation: r, reconciledUser: u }) => ({
      id: p.id,
      reference: p.reference,
      reservationId: p.reservationId,
      reservationRef: r?.reference || 'N/A',
      guestName: r?.guestName || 'Guest',
      guestEmail: r?.guestEmail || '',
      type: p.type,
      provider: p.provider,
      method: resolveMethod(p.channel, p.provider),
      status: p.status,
      amountMinor: p.amountMinor,
      feeMinor: p.feeMinor || 0,
      netAmountMinor: p.netAmountMinor || p.amountMinor,
      currency: p.currency,
      providerRef: p.providerRef,
      reconciled: p.reconciled,
      reconciledAt: p.reconciledAt?.toISOString() || null,
      reconciledBy: p.reconciledBy,
      reconciledByName: u ? `${u.firstName} ${u.lastName}` : null,
      note: p.note,
      proofUrl: null,
      failureReason: null,
      idempotencyKey: p.id,
      recordedBy: p.reconciledBy,
      recordedByName: u ? `${u.firstName} ${u.lastName}` : null,
      paidAt: p.paidAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }),
  );

  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getPaymentDetail(
  id: string,
  isOwner = false,
): Promise<PaymentDetailResponse | null> {
  const [row] = await db
    .select({
      payment: payments,
      reservation: reservations,
      roomType: roomTypes,
      staff: staffUsers,
    })
    .from(payments)
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .leftJoin(staffUsers, eq(payments.reconciledBy, staffUsers.id))
    .where(eq(payments.id, id))
    .limit(1);

  if (!row) return null;
  const { payment: p, reservation: r, roomType, staff: u } = row;
  if (!r) return null;

  // Query linked webhook events for this payment reference
  const relatedWebhooks = await db
    .select()
    .from(paymentWebhookEvents)
    .where(
      sql`${paymentWebhookEvents.payload}->>'reference' = ${p.reference} OR ${paymentWebhookEvents.payload}->'data'->>'reference' = ${p.reference}`,
    )
    .orderBy(desc(paymentWebhookEvents.createdAt))
    .limit(10);

  return {
    id: p.id,
    reference: p.reference,
    reservationId: p.reservationId,
    reservationRef: r?.reference || 'N/A',
    guestName: r?.guestName || 'Guest',
    guestEmail: r?.guestEmail || '',
    type: p.type,
    provider: p.provider,
    method: resolveMethod(p.channel, p.provider),
    status: p.status,
    amountMinor: p.amountMinor,
    feeMinor: p.feeMinor || 0,
    netAmountMinor: p.netAmountMinor || p.amountMinor,
    currency: p.currency,
    providerRef: p.providerRef,
    reconciled: p.reconciled,
    reconciledAt: p.reconciledAt?.toISOString() || null,
    reconciledBy: p.reconciledBy,
    reconciledByName: u ? `${u.firstName} ${u.lastName}` : null,
    note: p.note,
    proofUrl: null,
    failureReason: null,
    idempotencyKey: p.id,
    recordedBy: p.reconciledBy,
    recordedByName: u ? `${u.firstName} ${u.lastName}` : null,
    paidAt: p.paidAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    reservation: {
      id: r.id,
      reference: r.reference,
      guestName: r.guestName,
      guestEmail: r.guestEmail ?? '',
      roomTypeName: roomType?.name ?? 'Unknown room type',
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      nights: r.nights,
      status: r.status,
      totalMinor: r.totalMinor,
      amountPaidMinor: r.amountPaidMinor,
      amountRefundedMinor: r.amountRefundedMinor,
    },
    webhooks: relatedWebhooks.map((wh) => ({
      id: wh.id,
      provider: wh.provider,
      eventId: wh.eventId,
      eventType: wh.eventType,
      receivedAt: wh.createdAt.toISOString(),
      processed: wh.processed,
      processedAt: wh.processedAt?.toISOString() || null,
    })),
    rawGatewayResponse: isOwner
      ? (p.providerResponse as Record<string, unknown>) || null
      : null,
  };
}

export async function reconcilePaymentsBulk(params: {
  paymentIds: string[];
  staffUserId: string;
  note?: string;
}): Promise<{
  reconciledCount: number;
  skippedCount: number;
  missingCount: number;
}> {
  const rows = await db
    .select({
      id: payments.id,
      status: payments.status,
      type: payments.type,
      provider: payments.provider,
      providerRef: payments.providerRef,
      reference: payments.reference,
    })
    .from(payments)
    .where(inArray(payments.id, params.paymentIds));

  const eligible: string[] = [];
  for (const row of rows) {
    if (row.status !== 'paid') continue;

    if (row.type !== 'refund' && isPaymentProviderId(row.provider)) {
      const provider = getPaymentProvider(row.provider);
      if (provider.isConfigured() && provider.verifyTransaction) {
        const verified = await provider
          .verifyTransaction(row.providerRef ?? row.reference)
          .catch(() => null);
        if (!verified || verified.status !== 'paid') continue;
      }
    }
    eligible.push(row.id);
  }

  if (eligible.length > 0)
    await db
      .update(payments)
      .set({
        reconciled: true,
        reconciledAt: new Date(),
        reconciledBy: params.staffUserId,
        note: params.note || undefined,
        updatedAt: new Date(),
      })
      .where(inArray(payments.id, eligible));

  return {
    reconciledCount: eligible.length,
    skippedCount: rows.length - eligible.length,
    missingCount: params.paymentIds.length - rows.length,
  };
}

export async function recheckPayment(paymentId: string): Promise<{
  ok: boolean;
  error?: string;
  providerStatus: string;
  paymentStatus?: string;
}> {
  const [p] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!p)
    return {
      ok: false,
      error: ERROR_MESSAGES.PAYMENT_NOT_FOUND,
      providerStatus: 'not_found',
    };

  if (p.type === 'refund')
    return {
      ok: true,
      providerStatus:
        p.status === 'paid'
          ? 'completed'
          : p.status === 'failed'
            ? 'failed'
            : 'processing',
      paymentStatus: p.status,
    };

  if (!isPaymentProviderId(p.provider))
    return {
      ok: true,
      providerStatus: 'manual',
      paymentStatus: p.status,
    };

  const provider = getPaymentProvider(p.provider);
  if (!provider.isConfigured() || !provider.verifyTransaction)
    return {
      ok: true,
      providerStatus: 'unavailable',
      paymentStatus: p.status,
    };

  const verification = await provider.verifyTransaction(
    p.providerRef ?? p.reference,
  );
  if (!verification)
    return {
      ok: true,
      providerStatus: 'unavailable',
      paymentStatus: p.status,
    };

  if (verification.status === 'paid') {
    const result = await completeOnlinePayment({
      provider: p.provider,
      reference: p.reference,
      amountMinor: verification.amountMinor,
      payload: {
        ...(verification.payload ?? {}),
        source: 'admin_recheck',
      },
    });
    if (!result.ok)
      return {
        ok: false,
        error: ERROR_MESSAGES.PAYMENT_NOT_APPLIED(p.reference),
        providerStatus: 'paid',
        paymentStatus: p.status,
      };
    return {
      ok: true,
      providerStatus: 'completed',
      paymentStatus: 'paid',
    };
  }

  if (verification.status === 'failed') {
    await db
      .update(payments)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(payments.id, p.id));
    return {
      ok: true,
      providerStatus: 'failed',
      paymentStatus: 'failed',
    };
  }

  return {
    ok: true,
    providerStatus: 'pending',
    paymentStatus: p.status,
  };
}

export async function unreconcilePayment(params: {
  paymentId: string;
  actorId: string;
  actorRole: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (params.actorRole !== 'owner') {
    return {
      ok: false,
      error: ERROR_MESSAGES.OWNERS_ONLY_UNRECONCILE_BARE,
    };
  }

  const [p] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, params.paymentId))
    .limit(1);

  if (!p) {
    return { ok: false, error: ERROR_MESSAGES.PAYMENT_NOT_FOUND };
  }

  const helperRes = unreconcilePaymentHelper({
    payment: {
      id: p.id,
      type: p.type,
      status: p.status,
      method: resolveMethod(p.channel, p.provider),
      provider: p.provider,
      amountMinor: p.amountMinor,
      reconciled: p.reconciled,
      note: p.note,
      createdAt: p.createdAt,
    },
    actorRole: params.actorRole,
    reason: params.reason,
  });

  if (!helperRes.ok) return helperRes;

  await db
    .update(payments)
    .set({
      reconciled: false,
      reconciledAt: null,
      reconciledBy: null,
      note: helperRes.updatedPayment?.note,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, params.paymentId));

  return { ok: true };
}

export async function listManualRefunds(): Promise<ManualRefundItem[]> {
  const rows = await db
    .select({
      payment: payments,
      reservation: reservations,
    })
    .from(payments)
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .where(and(eq(payments.type, 'refund'), eq(payments.status, 'pending')));

  return rows.map(({ payment: p, reservation: r }) => ({
    id: p.id,
    reference: p.reference,
    reservationId: p.reservationId,
    reservationRef: r?.reference || 'N/A',
    guestName: r?.guestName || 'Guest',
    guestEmail: r?.guestEmail || '',
    amountMinor: p.amountMinor,
    refundDueMinor: p.amountMinor,
    provider: p.provider,
    method: resolveRefundMethod(p.channel, p.provider),
    status: p.status as 'pending' | 'paid' | 'failed',
    providerState: null,
    idempotencyKey: p.id,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function markManualRefundPaidOut(params: {
  paymentId: string;
  input: ManualRefundPayoutInput;
  staffUserId: string;
  actorRole: string;
}): Promise<{ ok: boolean; error?: string; already?: boolean }> {
  const result = await db.transaction(async (tx) => {
    const [p] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, params.paymentId))
      .for('update')
      .limit(1);

    if (!p) {
      return {
        ok: false as const,
        error: ERROR_MESSAGES.REFUND_PAYMENT_NOT_FOUND,
      };
    }
    if (p.type !== 'refund') {
      return {
        ok: false as const,
        error: ERROR_MESSAGES.REFUND_PAYMENT_NOT_FOUND,
      };
    }
    if (p.status === 'paid') {
      if (p.providerRef === params.input.reference)
        return { ok: true as const, already: true };
      return {
        ok: false as const,
        error: ERROR_MESSAGES.REFUND_ALREADY_PROCESSED,
      };
    }
    if (p.status !== 'pending')
      return {
        ok: false as const,
        error: ERROR_MESSAGES.REFUND_ALREADY_PROCESSED,
      };

    if (p.refundOfPaymentId && isPaymentProviderId(p.provider))
      return {
        ok: false as const,
        error: ERROR_MESSAGES.REFUND_PROVIDER_IN_PROGRESS,
      };

    const [r] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, p.reservationId))
      .for('update')
      .limit(1);

    if (!r) {
      return {
        ok: false as const,
        error: ERROR_MESSAGES.ASSOCIATED_RESERVATION_NOT_FOUND,
      };
    }

    const validation = validateManualRefundPayout({
      refundDueMinor: p.amountMinor,
      payoutAmountMinor: params.input.amountMinor,
      reservationTotalPaidMinor: r.amountPaidMinor,
      reservationTotalRefundedMinor: r.amountRefundedMinor,
    });

    if (!validation.ok) return validation;

    await tx
      .update(payments)
      .set({
        status: 'paid',
        paidAt: new Date(params.input.paidDate),
        channel: params.input.method,
        providerRef: params.input.reference,
        reconciled: true,
        reconciledAt: new Date(),
        reconciledBy: params.staffUserId,
        note: params.input.note,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, params.paymentId));

    await recomputeReservationFinancials(tx, r.id, r.totalMinor);

    await tx
      .update(refunds)
      .set({
        status: 'processed',
        method: params.input.method,
        providerRef: params.input.reference,
        processedAt: new Date(params.input.paidDate),
      })
      .where(eq(refunds.paymentId, params.paymentId));

    await tx.insert(reservationStatusHistory).values({
      reservationId: r.id,
      fromStatus: r.status,
      toStatus: r.status,
      reason: `Manual refund paid out: ${formatMinor(params.input.amountMinor)} via ${params.input.method}`,
      changedBy: params.staffUserId,
    });

    return { ok: true as const, reservation: r, payment: p };
  });

  if (!result.ok) return result;
  if ('already' in result && result.already) return result;
  if (!('reservation' in result) || !result.reservation)
    return {
      ok: false,
      error: ERROR_MESSAGES.ASSOCIATED_RESERVATION_NOT_FOUND,
    };
  const r = result.reservation;

  if (!params.input.doNotEmailGuest && r.guestEmail) {
    await sendRefundIssuedEmail({
      reservationReference: r.reference,
      guestEmail: r.guestEmail,
      guestName: r.guestName,
      amountMinor: params.input.amountMinor,
      method: params.input.method,
      reference: params.input.reference,
      note: params.input.note,
    });
  }

  return { ok: true };
}

export async function listWebhookEvents(
  params: WebhookEventsQueryParams,
): Promise<{ items: WebhookEventItem[]; total: number }> {
  const conditions = [];

  if (params.provider && params.provider !== 'all') {
    conditions.push(
      sql`${paymentWebhookEvents.provider}::text = ${params.provider}`,
    );
  }
  if (params.processed === 'yes') {
    conditions.push(eq(paymentWebhookEvents.processed, true));
  } else if (params.processed === 'no') {
    conditions.push(eq(paymentWebhookEvents.processed, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(paymentWebhookEvents)
    .where(whereClause)
    .orderBy(desc(paymentWebhookEvents.createdAt))
    .limit(params.pageSize);

  const now = Date.now();
  const items: WebhookEventItem[] = rows.map((evt) => {
    const elapsedMs = now - evt.createdAt.getTime();
    return {
      id: evt.id,
      provider: evt.provider,
      eventId: evt.eventId,
      eventType: evt.eventType,
      receivedAt: evt.createdAt.toISOString(),
      processed: evt.processed,
      processedAt: evt.processedAt?.toISOString() || null,
      isOverdue: !evt.processed && elapsedMs > 10 * 60 * 1000,
      payloadMasked: evt.payload as Record<string, unknown>,
    };
  });

  return { items, total: items.length };
}

export async function reprocessWebhookEvent(
  id: string,
  actorId: string,
): Promise<{ ok: boolean; message: string }> {
  const [evt] = await db
    .select()
    .from(paymentWebhookEvents)
    .where(eq(paymentWebhookEvents.id, id))
    .limit(1);

  if (!evt) {
    return { ok: false, message: ERROR_MESSAGES.WEBHOOK_EVENT_NOT_FOUND };
  }

  if (evt.processed) {
    return {
      ok: false,
      message: ERROR_MESSAGES.WEBHOOK_ALREADY_PROCESSED,
    };
  }

  try {
    if (isPaymentProviderId(evt.provider))
      await applyStoredWebhookEvent(
        evt.provider,
        evt.eventType ?? '',
        evt.payload as Record<string, unknown>,
      );
  } catch (error) {
    await db
      .update(paymentWebhookEvents)
      .set({
        processed: false,
        processedAt: null,
        error: error instanceof Error ? error.message : String(error),
      })
      .where(eq(paymentWebhookEvents.id, id));
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  await db
    .update(paymentWebhookEvents)
    .set({ processed: true, processedAt: new Date(), error: null })
    .where(eq(paymentWebhookEvents.id, id));

  await recordAuditLog({
    actorId,
    actorRole: 'manager',
    entity: 'payment_webhook_event',
    entityId: id,
    action: 'reprocess',
    reason: 'Manual reprocess triggered by staff',
  });

  return { ok: true, message: SUCCESS_MESSAGES.WEBHOOK_REPROCESSED };
}
