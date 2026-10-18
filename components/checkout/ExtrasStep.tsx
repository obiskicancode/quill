import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { unitLabels } from '@/lib/checkout/format'
import type { ExtraItem } from '@/types/checkout.types'
import { formatMinor } from '@/types/stay.types'
import { EASE_OUT } from '../motion/variants'
import { GuestStepper } from '../GuestStepper'

interface ExtrasStepProps {
  catalog: ExtraItem[]
  quantities: Record<string, number>
  onQuantity: (id: string, quantity: number) => void
  /** Per-line totals from the server breakdown. */
  lineTotals: Record<string, number>
  extraBed: { needed: boolean; available: boolean; priceMinor: number | null; selected: boolean }
  onExtraBed: (selected: boolean) => void
  guests: number
  disabled: boolean
}

/** Step 2. Shown only when the hotel has active extras, or the extra bed applies. Totals come from the server. */
export function ExtrasStep({ catalog, quantities, onQuantity, lineTotals, extraBed, onExtraBed, guests, disabled }: ExtrasStepProps) {
  const reduced = useReducedMotion()
  return (
    <section id="step-extras" aria-labelledby="extras-title" className="space-y-5">
      <h2 id="extras-title" className="font-display text-h3">Extras</h2>

      {extraBed.needed && extraBed.available && (
        <div className="flex items-start justify-between gap-4 rounded-card border border-line bg-surface p-5">
          <div>
            <p id="extra-bed-label" className="font-semibold">Extra bed</p>
            <p className="mt-1 text-small text-muted">
              {guests} guests need one. {extraBed.priceMinor ? `${formatMinor(extraBed.priceMinor)} per night.` : 'No charge.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={extraBed.selected}
            aria-labelledby="extra-bed-label"
            disabled={disabled}
            onClick={() => onExtraBed(!extraBed.selected)}
            className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${extraBed.selected ? 'border-ink bg-ink' : 'border-ink/60 bg-surface'}`}
          >
            <span className={`inline-block size-5 rounded-full transition-transform ${extraBed.selected ? 'translate-x-6 bg-paper' : 'translate-x-1 bg-ink'}`} />
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {catalog.map((item) => {
          const qty = quantities[item.id] ?? 0
          return (
            <li key={item.id} className="rounded-card border border-line bg-surface px-5">
              <GuestStepper
                label={item.name}
                hint={`${formatMinor(item.priceMinor)} ${unitLabels[item.unit]}. ${item.description}`}
                value={qty}
                min={0}
                max={disabled ? qty : item.maxQuantity}
                onChange={(n) => onQuantity(item.id, n)}
              />
              <AnimatePresence initial={false}>
                {qty > 0 && lineTotals[item.id] !== undefined && (
                  <motion.p
                    key="line-total"
                    initial={reduced ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reduced ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                    style={{ overflow: 'hidden' }}
                    className="-mt-2 pb-4 text-small font-semibold"
                  >
                    Adds {formatMinor(lineTotals[item.id])} to your stay
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
