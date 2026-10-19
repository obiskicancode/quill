import { apiFail, apiOk } from '@/app/api/envelope';
import { config } from '@/config';
import { rateLimited } from '@/lib/checkout/mock-db';
import { getHotelSettings } from '@/lib/content/data';
import { enquiryStore, saveEnquiry } from '@/lib/content/enquiries';
import { fieldErrorsFrom } from '@/schemas/checkout.schema';
import {
  enquirySchema,
  type EnquiryError,
  type EnquiryResponse,
} from '@/schemas/content.schema';

const noStore = { 'Cache-Control': 'no-store' };
const fail = (
  status: number,
  error: EnquiryError,
  headers: Record<string, string> = {},
) =>
  apiFail(status, error.message, error, {
    headers: { ...noStore, ...headers },
  });

const tooMany = () =>
  fail(
    429,
    {
      code: 'rate_limited',
      message:
        'You have sent a few messages already. Please wait a few minutes, or message us on WhatsApp.',
      retryAfterSeconds: 600,
    },
    { 'Retry-After': '600' },
  );

/**
 * Stores a contact enquiry (type, status "new"), emails the contact form recipient, alerts the hotel's notification
 * recipients and sends the guest an auto-reply. Safe to retry: the same idempotency key never creates a second enquiry.
 */
export async function POST(req: Request) {
  const client =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

  // Mistakes in the form are cheap and must not use up the guest's sending allowance, so they get their own generous limit.
  const parsed = enquirySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    if (rateLimited(`enquiry-invalid:${client}`, 30, 10 * 60_000))
      return tooMany();
    return fail(422, {
      code: 'validation',
      message: 'Some details need fixing.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const data = parsed.data;
  const responseHours = getHotelSettings().enquiryResponseHours;

  // Honeypot: bots fill the hidden field. Reply as if it worked, store nothing.
  if (data.website)
    return apiOk<EnquiryResponse>(
      { reference: 'ENQ-000000', responseHours },
      { headers: noStore },
    );

  // Replay of the same key returns the same enquiry and does not count against the limit.
  const earlier = enquiryStore.keys.get(data.idempotencyKey);
  if (earlier)
    return apiOk<EnquiryResponse>(
      { reference: earlier, responseHours },
      { headers: noStore },
    );

  // Preview switches (development only).
  if (config.isDev) {
    if (data.demo === 'ratelimit') return tooMany();
    if (
      data.demo === 'error' &&
      !enquiryStore.failedOnce.has(data.idempotencyKey)
    ) {
      enquiryStore.failedOnce.add(data.idempotencyKey);
      return fail(503, {
        code: 'server',
        message: "We couldn't send your message.",
      });
    }
  }

  // Three new messages per ten minutes per visitor.
  if (rateLimited(`enquiry:${client}`, 3, 10 * 60_000)) return tooMany();

  const row = saveEnquiry(data);
  return apiOk<EnquiryResponse>(
    { reference: row.reference, responseHours },
    { status: 201, headers: noStore },
  );
}
