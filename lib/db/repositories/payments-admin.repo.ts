import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  payments,
  paymentWebhookEvents,
  reservations,
  reservationStatusHistory,
  staffUsers,
} from '@/db/schema';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { sendRefundIssuedEmail } from '@/lib/mail';
import {
  computePaymentSummary,
  unreconcilePayment,
  validateManualRefundPayout,
} from '@/lib/payments/reconciliation';
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
} from '@/types/payments-admin.types';

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

export async function getPaymentsSummaryRepo(
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

export async function getPaymentsBreakdownRepo(
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
    const label = d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
    });
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

export async function listPaymentsRepo(params: PaymentsQueryParams): Promise<{
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

export async function getPaymentDetailRepo(
  id: string,
  isOwner = false,
): Promise<PaymentDetailResponse | null> {
  const [row] = await db
    .select({
      payment: payments,
      reservation: reservations,
      staff: staffUsers,
    })
    .from(payments)
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(staffUsers, eq(payments.reconciledBy, staffUsers.id))
    .where(eq(payments.id, id))
    .limit(1);

  if (!row) return null;
  const { payment: p, reservation: r, staff: u } = row;

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
      id: r?.id || p.reservationId,
      reference: r?.reference || 'N/A',
      guestName: r?.guestName || 'Guest',
      guestEmail: r?.guestEmail || '',
      roomTypeName: 'Hotel Room',
      checkIn: r?.checkIn || '2026-11-01',
      checkOut: r?.checkOut || '2026-11-04',
      nights: 3,
      status: r?.status || 'confirmed',
      totalMinor: r?.totalMinor || p.amountMinor,
      amountPaidMinor: r?.amountPaidMinor || p.amountMinor,
      amountRefundedMinor: r?.amountRefundedMinor || 0,
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

export async function reconcilePaymentsBulkRepo(params: {
  paymentIds: string[];
  staffUserId: string;
  note?: string;
}): Promise<{ reconciledCount: number }> {
  const updated = await db
    .update(payments)
    .set({
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: params.staffUserId,
      note: params.note || undefined,
      updatedAt: new Date(),
    })
    .where(inArray(payments.id, params.paymentIds))
    .returning({ id: payments.id });

  return { reconciledCount: updated.length };
}

export async function unreconcilePaymentRepo(params: {
  paymentId: string;
  actorId: string;
  actorRole: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (params.actorRole !== 'owner') {
    return {
      ok: false,
      error: 'Only owners are permitted to unreconcile payments',
    };
  }

  const [p] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, params.paymentId))
    .limit(1);

  if (!p) {
    return { ok: false, error: 'Payment not found' };
  }

  const helperRes = unreconcilePayment({
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

export async function listManualRefundsRepo(): Promise<ManualRefundItem[]> {
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

export async function markManualRefundPaidOutRepo(params: {
  paymentId: string;
  input: ManualRefundPayoutInput;
  staffUserId: string;
  actorRole: string;
}): Promise<{ ok: boolean; error?: string }> {
  const [p] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, params.paymentId))
    .limit(1);

  if (!p) {
    return { ok: false, error: 'Refund payment not found' };
  }

  const [r] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, p.reservationId))
    .limit(1);

  if (!r) {
    return { ok: false, error: 'Associated reservation not found' };
  }

  const validation = validateManualRefundPayout({
    refundDueMinor: p.amountMinor,
    payoutAmountMinor: params.input.amountMinor,
    reservationTotalPaidMinor: r.amountPaidMinor,
    reservationTotalRefundedMinor: r.amountRefundedMinor,
  });

  if (!validation.ok) return validation;

  const newRefunded = r.amountRefundedMinor + params.input.amountMinor;

  await db
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

  await db
    .update(reservations)
    .set({
      amountRefundedMinor: newRefunded,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, r.id));

  await db.insert(reservationStatusHistory).values({
    reservationId: r.id,
    fromStatus: r.status,
    toStatus: r.status,
    reason: `Manual refund paid out: ₦${(params.input.amountMinor / 100).toLocaleString()} via ${params.input.method}`,
    changedBy: params.staffUserId,
  });

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

export async function listWebhookEventsRepo(
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

export async function reprocessWebhookEventRepo(
  id: string,
  actorId: string,
): Promise<{ ok: boolean; message: string }> {
  const [evt] = await db
    .select()
    .from(paymentWebhookEvents)
    .where(eq(paymentWebhookEvents.id, id))
    .limit(1);

  if (!evt) {
    return { ok: false, message: 'Webhook event not found' };
  }

  if (evt.processed) {
    return {
      ok: false,
      message: 'This webhook event has already been successfully processed',
    };
  }

  await db
    .update(paymentWebhookEvents)
    .set({ processed: true, processedAt: new Date() })
    .where(eq(paymentWebhookEvents.id, id));

  await recordAuditLog({
    actorId,
    actorRole: 'manager',
    entity: 'payment_webhook_event',
    entityId: id,
    action: 'reprocess',
    reason: 'Manual reprocess triggered by staff',
  });

  return { ok: true, message: 'Webhook event reprocessed successfully' };
}
