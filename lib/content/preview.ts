import { config } from '@/config'

/**
 * Development-only preview switches, read from ?preview= on each content page.
 *   preview=empty            every optional section has no data (so it is omitted)
 *   preview=empty:team       only the "team" section is empty
 *   preview=loading:faq      the "faq" section is slow (shows its skeleton for 2.5 s)
 *   preview=error:facilities the "facilities" section fails (shows its error card with Retry)
 * Combine with commas. Section keys: story, values, highlights, team, surroundings, testimonials, facilities,
 * roomAmenities, extras, events, gallery, contactCards, location, faq.
 */
export interface PreviewFlags {
  has(kind: 'loading' | 'empty' | 'error' | 'year', key: string): boolean
}

const none: PreviewFlags = { has: () => false }

export function parsePreview(raw: string | string[] | undefined | null): PreviewFlags {
  if (config.isProd || !raw) return none
  const tokens = new Set((Array.isArray(raw) ? raw[0] : raw).split(',').map((t) => t.trim()).filter(Boolean))
  return { has: (kind, key) => tokens.has(kind) || tokens.has(`${kind}:${key}`) }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Applies the preview switches to one section's data: slow, failing or empty on request. */
export async function gate<T>(flags: PreviewFlags, key: string, data: T, empty: T): Promise<T> {
  if (flags.has('loading', key)) await sleep(2500)
  if (flags.has('error', key)) throw new Error(`Preview: the "${key}" section failed to load.`)
  return flags.has('empty', key) ? empty : data
}

/** Reads a value switch such as ?preview=form:error (development only). */
export function previewValue(raw: string | string[] | undefined | null, key: string): string | null {
  if (config.isProd || !raw) return null
  const hit = (Array.isArray(raw) ? raw[0] : raw).split(',').map((t) => t.trim()).find((t) => t.startsWith(`${key}:`))
  return hit ? hit.slice(key.length + 1) : null
}
