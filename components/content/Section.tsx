import { Suspense, type ReactNode } from 'react'
import { SectionBoundary } from './SectionBoundary'

/** One data-driven section: a skeleton while it loads, an error card with Retry if it fails. */
export function Section({ label, skeleton, children }: { label: string; skeleton: ReactNode; children: ReactNode }) {
  return (
    <SectionBoundary label={label}>
      <Suspense fallback={skeleton}>{children}</Suspense>
    </SectionBoundary>
  )
}
