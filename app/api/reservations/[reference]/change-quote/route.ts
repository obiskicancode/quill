import { loadReservation } from '@/lib/booking/view'
import { fieldErrorsFrom } from '@/schemas/checkout.schema'
import { quoteChange } from '@/lib/manage/actions'
import { manageError, requireManage } from '@/lib/manage/auth'
import { apiOk } from '@/app/api/envelope'
import { changeQuoteRequestSchema } from '@/schemas/manage.schema'
import { hotelClock } from '@/lib/stay-quote'

/** Re-quotes the SAME room type for new dates: availability, the new breakdown, the difference and the new deadline. */
export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params
  const demo = new URL(req.url).searchParams.get('demo')
  const auth = await requireManage(req, reference, demo)
  if (!auth.ok) return auth.res

  const parsed = changeQuoteRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return manageError(422, { code: 'validation', message: 'Choose valid dates.', fieldErrors: fieldErrorsFrom(parsed.error) })
  const r = await loadReservation(reference, demo)
  if (!r) return manageError(404, { code: 'not_found', message: 'Booking not found.' })
  const demos = new Set((demo ?? '').split(',').map((t) => t.trim()))
  if (demos.has('quoteerror')) return manageError(503, { code: 'server', message: "We couldn't check those dates." })

  const quote = await quoteChange(r, parsed.data, hotelClock(), demos)
  return apiOk(quote, { headers: { 'Cache-Control': 'no-store' } })
}
