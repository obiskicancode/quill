import { eq } from 'drizzle-orm';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { paymentProofs, reservationChanges } from '@/db/schema';
import { getAccess } from '@/lib/booking/session';
import {
  createReference,
  insertPayment,
  logEvent,
  saveStoredReservation,
} from '@/lib/booking/store';
import { loadReservation, statusOf } from '@/lib/booking/view';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import { requireManage } from '@/lib/manage/auth';
import { rateLimit } from '@/lib/rate-limit';
import { proofStorageConfigured, uploadProof } from '@/lib/storage/proofs';
import { checkProofFile } from '@/schemas/checkout.schema';
import type { ApiError } from '@/types/checkout.types';

const fail = (status: number, error: ApiError) =>
  apiFail(status, error.message, error);

/** Receives the bank-transfer receipt (JPG, PNG, WebP or PDF, up to 5 MB) and records it against the pending payment. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const client = clientIp(req) ?? 'local';
  if (!(await rateLimit(`proof:${client}`, 10, 60_000)).allowed)
    return fail(429, {
      code: ERROR_CODES.RATE_LIMITED,
      message: ERROR_MESSAGES.RATE_LIMITED,
    });

  const url = new URL(req.url);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File))
    return fail(422, {
      code: ERROR_CODES.BAD_FILE,
      message: ERROR_MESSAGES.CHOOSE_RECEIPT,
    });
  const problem = checkProofFile(file);
  if (problem)
    return fail(422, { code: ERROR_CODES.BAD_FILE, message: problem });
  if (!proofStorageConfigured())
    return fail(503, {
      code: ERROR_CODES.UNAVAILABLE,
      message: ERROR_MESSAGES.RECEIPT_UPLOADS_UNAVAILABLE,
    });

  const changeId = url.searchParams.get('change');
  if (changeId) {
    const auth = await requireManage(req, reference);
    if (!auth.ok) return auth.res;
    const r = await loadReservation(reference);
    const pc = r?.pendingChange;
    if (
      !r ||
      !pc ||
      pc.changeId !== changeId ||
      pc.status !== 'awaiting_transfer'
    )
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.CHANGE_NOT_AWAITING_TRANSFER,
      });
    let storageKey: string;
    try {
      storageKey = await uploadProof({ reference, file });
    } catch {
      return fail(502, {
        code: ERROR_CODES.SERVER,
        message: ERROR_MESSAGES.RECEIPT_STORAGE_FAILED,
      });
    }
    const paymentId = await insertPayment({
      reservationId: r.id,
      reference: createReference(),
      method: 'bank_transfer',
      amountMinor: pc.amountDueMinor,
      provider: 'bank_transfer',
      note: pc.changeId,
    });
    await db
      .update(reservationChanges)
      .set({ paymentId, updatedAt: new Date() })
      .where(eq(reservationChanges.id, pc.changeId));
    await db.insert(paymentProofs).values({
      paymentId,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    pc.status = 'awaiting_verification';
    logEvent(r, 'transfer_proof_received', 'For your new dates', 'guest');
    await saveStoredReservation(r);
    return apiOk({ ok: true });
  }

  const reservation = await loadReservation(reference);
  if (!reservation)
    return fail(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.RESERVATION_NOT_FOUND,
    });

  const access = await getAccess(reference);
  if (!access)
    return fail(401, {
      code: ERROR_CODES.UNAUTHORISED,
      message: ERROR_MESSAGES.SESSION_EXPIRED,
    });

  if (reservation.status === 'expired')
    return fail(410, {
      code: ERROR_CODES.HOLD_EXPIRED,
      message: ERROR_MESSAGES.HOLD_EXPIRED,
    });
  if (reservation.status !== 'awaiting_transfer')
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.RESERVATION_NOT_AWAITING_TRANSFER,
    });

  let storageKey: string;
  try {
    storageKey = await uploadProof({ reference, file });
  } catch {
    return fail(502, {
      code: ERROR_CODES.SERVER,
      message: ERROR_MESSAGES.RECEIPT_STORAGE_FAILED,
    });
  }
  const paymentId = await insertPayment({
    reservationId: reservation.id,
    reference: createReference(),
    method: 'bank_transfer',
    amountMinor: reservation.totals.dueNowMinor,
    provider: 'bank_transfer',
  });
  await db.insert(paymentProofs).values({
    paymentId,
    storageKey,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  reservation.proof = { type: file.type, size: file.size };
  reservation.status = 'awaiting_verification';
  logEvent(reservation, 'transfer_proof_received', undefined, 'guest');
  await saveStoredReservation(reservation);
  return apiOk(statusOf(reservation));
}
