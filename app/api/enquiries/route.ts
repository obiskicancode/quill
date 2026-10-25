import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getHotelSettings } from '@/lib/content/data';
import { createEnquiry } from '@/lib/db/repositories/enquiries.repo';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { rateLimit } from '@/lib/rate-limit';
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
      code: ERROR_CODES.RATE_LIMITED,
      message: ERROR_MESSAGES.RATE_LIMITED_ENQUIRY,
      retryAfterSeconds: 600,
    },
    { 'Retry-After': '600' },
  );

const referenceOf = (id: string) =>
  `ENQ-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

/**
 * Stores a contact enquiry (type, status "new"). Safe to retry: the same idempotency key never creates a second enquiry.
 */
export async function POST(req: Request) {
  const client =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

  const parsed = enquirySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    if (
      !(await rateLimit(`enquiry-invalid:${client}`, 30, 10 * 60_000)).allowed
    )
      return tooMany();
    return fail(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.SOME_DETAILS_NEED_FIXING,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const data = parsed.data;
  const responseHours = (await getHotelSettings()).enquiryResponseHours;

  if (data.website)
    return apiOk<EnquiryResponse>(
      { reference: 'ENQ-000000', responseHours },
      { headers: noStore },
    );

  const idKey = `enquiry:${data.idempotencyKey}`;
  const earlier = await getIdempotencyRecord(idKey);
  if (earlier?.response)
    return apiOk(earlier.response as EnquiryResponse, { headers: noStore });

  if (!(await rateLimit(`enquiry:${client}`, 3, 10 * 60_000)).allowed)
    return tooMany();

  const row = await createEnquiry({
    type: data.topic === 'corporate_account' ? 'corporate' : data.topic,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message,
    checkIn: data.checkIn || null,
    checkOut: data.checkOut || null,
    guests: data.guests ? Number(data.guests) : null,
    roomTypeInterest: data.roomType || null,
    status: 'new',
    source: data.source_page ?? null,
    ipAddress: client === 'local' ? null : client,
    userAgent: req.headers.get('user-agent'),
  });
  const response: EnquiryResponse = {
    reference: referenceOf(row.id),
    responseHours,
  };
  await setIdempotency(idKey, response, 201, 60 * 24, {
    method: 'POST',
    path: '/api/enquiries',
  });
  return apiOk(response, { status: 201, headers: noStore });
}
