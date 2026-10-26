import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { loadReservation } from '@/lib/booking/view';
import { hotelClock } from '@/lib/dates';
import { apiOk } from '@/lib/http/envelope';
import { quoteChange } from '@/lib/manage/actions';
import { manageError, requireManage } from '@/lib/manage/auth';
import { fieldErrorsFrom } from '@/schemas/checkout.schema';
import { changeQuoteRequestSchema } from '@/schemas/manage.schema';

/** Re-quotes the SAME room type for new dates: availability, the new breakdown, the difference and the new deadline. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const auth = await requireManage(req, reference);
  if (!auth.ok) return auth.res;

  const parsed = changeQuoteRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return manageError(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.CHOOSE_VALID_DATES,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  const r = await loadReservation(reference);
  if (!r)
    return manageError(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.BOOKING_NOT_FOUND,
    });
  const quote = await quoteChange(r, parsed.data, hotelClock());
  return apiOk(quote, { noCache: true });
}
