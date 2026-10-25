import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { fieldErrorsFrom, quoteRequestSchema } from '@/schemas/checkout.schema';
import type { ApiError } from '@/types/checkout.types';

/** Server-calculated breakdown, availability, hold requirements and policy summary. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.CHECK_STAY_DETAILS,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
    return apiFail(422, error.message, error);
  }
  try {
    const quote = await buildCheckoutQuote({
      ...parsed.data,
      extras: parsed.data.extras,
    });
    return apiOk(quote, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    const error: ApiError = {
      code: ERROR_CODES.SERVER,
      message: ERROR_MESSAGES.PRICE_CALCULATION_FAILED,
    };
    return apiFail(503, error.message, error);
  }
}
