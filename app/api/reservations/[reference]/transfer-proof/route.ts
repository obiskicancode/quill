import { apiFail, apiOk } from '@/app/api/envelope';
import { loadReservation } from '@/lib/booking/view';
import { logEvent, refresh, store, toStatus } from '@/lib/checkout/mock-db';
import { requireManage } from '@/lib/manage/auth';
import { checkProofFile } from '@/schemas/checkout.schema';
import type { ApiError } from '@/types/checkout.types';

const fail = (status: number, error: ApiError) =>
  apiFail(status, error.message, error);

/** Receives the bank-transfer receipt (JPG, PNG, WebP or PDF, up to 5 MB). MOCK: stores only the file's type and size. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const url = new URL(req.url);

  // Receipt for the extra payment on a date change (manage page): needs the manage session and CSRF token.
  const changeId = url.searchParams.get('change');
  if (changeId) {
    const demo = url.searchParams.get('demo');
    const auth = await requireManage(req, reference, demo);
    if (!auth.ok) return auth.res;
    const r = await loadReservation(reference, demo);
    const pc = r?.pendingChange;
    if (
      !r ||
      !pc ||
      pc.changeId !== changeId ||
      pc.status !== 'awaiting_transfer'
    )
      return fail(409, {
        code: 'validation',
        message: 'This date change is not waiting for a transfer.',
      });
    const f = (await req.formData().catch(() => null))?.get('file');
    if (!(f instanceof File))
      return fail(422, {
        code: 'bad_file',
        message: 'Choose a receipt to upload.',
      });
    const problem = checkProofFile(f);
    if (problem) return fail(422, { code: 'bad_file', message: problem });
    pc.status = 'awaiting_verification';
    logEvent(r, 'transfer_proof_received', 'For your new dates', 'guest');
    return apiOk({ ok: true });
  }

  const reservation = store.reservations.get(reference);
  if (!reservation)
    return fail(404, { code: 'not_found', message: 'Reservation not found.' });
  refresh(reservation);
  if (reservation.status === 'expired')
    return fail(410, {
      code: 'hold_expired',
      message: 'The hold on this room has ended.',
    });
  if (reservation.status !== 'awaiting_transfer')
    return fail(409, {
      code: 'validation',
      message: 'This reservation is not waiting for a transfer.',
    });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File))
    return fail(422, {
      code: 'bad_file',
      message: 'Choose a receipt to upload.',
    });
  const problem = checkProofFile(file);
  if (problem) return fail(422, { code: 'bad_file', message: problem });

  reservation.proof = { type: file.type, size: file.size };
  reservation.status = 'awaiting_verification';
  logEvent(reservation, 'transfer_proof_received', undefined, 'guest');
  return apiOk(toStatus(reservation));
}
