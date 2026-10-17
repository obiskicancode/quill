'use client'

import { CopyButton } from '../checkout/PaymentStep'

/** The booking reference in large text with a labelled copy button that confirms the copy to screen readers. */
export function ReferenceBlock({ reference, large = false }: { reference: string; large?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div>
        <p className="text-caption font-semibold opacity-80">Booking reference</p>
        <p className={`font-display tracking-wide ${large ? 'text-h2 md:text-display' : 'text-h3'}`}>{reference}</p>
      </div>
      <CopyButton value={reference} label="booking reference" />
    </div>
  )
}
