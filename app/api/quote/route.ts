import { apiFail, apiOk } from '@/app/api/envelope';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { fieldErrorsFrom, quoteRequestSchema } from '@/schemas/checkout.schema';
import type { ApiError } from '@/types/checkout.types';

/** Server-calculated breakdown, availability, hold requirements and policy summary. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: 'validation',
      message: 'Check the stay details and try again.',
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
      code: 'server',
      message: "We couldn't calculate your price.",
    };
    return apiFail(503, error.message, error);
  }
}
