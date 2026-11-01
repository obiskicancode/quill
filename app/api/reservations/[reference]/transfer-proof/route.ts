import { eq } from 'drizzle-orm';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { paymentProofs, reservationChanges, reservations } from '@/db/schema';
import { getAccess } from '@/lib/booking/session';
import {
  createReference,
  findReusablePayment,
  insertPayment,
  loadStoredReservation,
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

type ProofOutcome =
  | { ok: true; status?: ReturnType<typeof statusOf> }
  | { ok: false; response: ReturnType<typeof fail> };

/**
 * Records the uploaded receipt, its payment row and the resulting status in one
 * commit. The reservation is locked and re-read first, so a webhook or a second
 * upload that moved it while the file was in flight is seen here instead of being
 * overwritten by the copy read before the storage call.
 *
 * The storage upload itself stays outside the transaction: an orphan object is the
 * only possible leftover, and the pre-existing behaviour already accepts that.
 */
async function commitProof(input: {
  reference: string;
  reservationId: string;
  changeId: string | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ProofOutcome> {
  return db.transaction(async (tx): Promise<ProofOutcome> => {
    await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.id, input.reservationId))
      .limit(1)
      .for('update');

    const fresh = await loadStoredReservation(input.reference, tx);
    if (!fresh)
      return {
        ok: false,
        response: fail(404, {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.RESERVATION_NOT_FOUND,
        }),
      };

    if (input.changeId) {
      const change = fresh.pendingChange;
      if (
        !change ||
        change.changeId !== input.changeId ||
        change.status !== 'awaiting_transfer'
      )
        return {
          ok: false,
          response: fail(409, {
            code: ERROR_CODES.VALIDATION,
            message: ERROR_MESSAGES.CHANGE_NOT_AWAITING_TRANSFER,
          }),
        };

      const reusable = await findReusablePayment(
        {
          reservationId: fresh.id,
          provider: 'bank_transfer',
          amountMinor: change.amountDueMinor,
          changeId: change.changeId,
        },
        tx,
      );
      const paymentId =
        reusable?.id ??
        (await insertPayment(
          {
            reservationId: fresh.id,
            reference: createReference(),
            method: 'bank_transfer',
            amountMinor: change.amountDueMinor,
            provider: 'bank_transfer',
            note: change.changeId,
          },
          tx,
        ));
      await tx
        .update(reservationChanges)
        .set({ paymentId, updatedAt: new Date() })
        .where(eq(reservationChanges.id, change.changeId));
      await tx.insert(paymentProofs).values({
        paymentId,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      });
      change.status = 'awaiting_verification';
      logEvent(fresh, 'transfer_proof_received', 'For your new dates', 'guest');
      await saveStoredReservation(fresh, tx);
      return { ok: true };
    }

    if (fresh.status === 'expired')
      return {
        ok: false,
        response: fail(410, {
          code: ERROR_CODES.HOLD_EXPIRED,
          message: ERROR_MESSAGES.HOLD_EXPIRED,
        }),
      };
    if (fresh.status !== 'awaiting_transfer')
      return {
        ok: false,
        response: fail(409, {
          code: ERROR_CODES.VALIDATION,
          message: ERROR_MESSAGES.RESERVATION_NOT_AWAITING_TRANSFER,
        }),
      };

    // `initialize` already created the transfer attempt the guest was shown, so the
    // proof joins that row instead of opening a second one for the same receipt.
    const reusable = await findReusablePayment(
      {
        reservationId: fresh.id,
        provider: 'bank_transfer',
        amountMinor: fresh.totals.dueNowMinor,
      },
      tx,
    );
    const paymentId =
      reusable?.id ??
      (await insertPayment(
        {
          reservationId: fresh.id,
          reference: createReference(),
          method: 'bank_transfer',
          amountMinor: fresh.totals.dueNowMinor,
          provider: 'bank_transfer',
        },
        tx,
      ));
    await tx.insert(paymentProofs).values({
      paymentId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    fresh.proof = { type: input.mimeType, size: input.sizeBytes };
    fresh.status = 'awaiting_verification';
    logEvent(fresh, 'transfer_proof_received', undefined, 'guest');
    await saveStoredReservation(fresh, tx);
    return { ok: true, status: statusOf(fresh) };
  });
}

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
    const outcome = await commitProof({
      reference,
      reservationId: r.id,
      changeId,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return outcome.ok ? apiOk({ ok: true }) : outcome.response;
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
      code: ERROR_CODES.UNAUTHORIZED,
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
  const outcome = await commitProof({
    reference,
    reservationId: reservation.id,
    changeId: null,
    storageKey,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  return outcome.ok ? apiOk(outcome.status) : outcome.response;
}
