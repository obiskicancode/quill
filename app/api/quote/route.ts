import { NextResponse } from 'next/server'
import { buildCheckoutQuote } from '@/lib/checkout/quote'
import { fieldErrorsFrom, quoteRequestSchema } from '@/lib/checkout/schemas'
import type { ApiError } from '@/lib/checkout/types'

/** Server-calculated breakdown, availability, hold requirements and policy summary. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = quoteRequestSchema.safeParse(body)
  if (!parsed.success) {
    const error: ApiError = { code: 'validation', message: 'Check the stay details and try again.', fieldErrors: fieldErrorsFrom(parsed.error) }
    return NextResponse.json(error, { status: 422 })
  }
  try {
    const quote = await buildCheckoutQuote({ ...parsed.data, extras: parsed.data.extras })
    return NextResponse.json(quote, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    const error: ApiError = { code: 'server', message: "We couldn't calculate your price." }
    return NextResponse.json(error, { status: 503 })
  }
}
