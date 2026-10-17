import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'warning' | 'muted' | 'overlay'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink/8 text-ink',
  accent: 'bg-accent text-ink',
  warning: 'bg-surface text-danger ring-1 ring-danger/40',
  muted: 'bg-ink text-white',
  overlay: 'bg-ink/80 text-white',
}

/** Small label. All pairings are 4.5:1 or better. */
export function Badge({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-caption font-semibold ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

/** "Only N left" appears only when two or fewer rooms really remain. "Not available" appears for sold-out dates. */
export function AvailabilityBadge({ remaining, soldOut = false }: { remaining?: number; soldOut?: boolean }) {
  if (soldOut) return <Badge tone="muted">Not available</Badge>
  if (remaining !== undefined && remaining > 0 && remaining <= 2) {
    return <Badge tone="warning">Only {remaining} left</Badge>
  }
  return null
}
