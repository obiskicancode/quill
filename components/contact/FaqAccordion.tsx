'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Faq } from '@/lib/content/types'
import { EASE_OUT } from '../motion/variants'

/**
 * WAI-ARIA accordion: each question is a button in a heading with aria-expanded and aria-controls.
 * Up and Down move between questions, Home and End jump to the first and last. `single` keeps one answer open.
 */
export function FaqAccordion({ faqs, mode = 'single' }: { faqs: Faq[]; mode?: 'single' | 'multi' }) {
  const base = useId()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const reduced = useReducedMotion()

  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(mode === 'single' ? [] : cur)
      if (cur.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  function onKeyDown(e: KeyboardEvent, i: number) {
    const last = faqs.length - 1
    const target = e.key === 'ArrowDown' ? (i + 1) % faqs.length : e.key === 'ArrowUp' ? (i - 1 + faqs.length) % faqs.length : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (target === null) return
    e.preventDefault()
    buttons.current[target]?.focus()
  }

  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((f, i) => {
        const expanded = open.has(f.id)
        return (
          <div key={f.id}>
            <h3>
              <button
                ref={(el) => { buttons.current[i] = el }}
                type="button"
                id={`${base}-q-${f.id}`}
                aria-expanded={expanded}
                aria-controls={`${base}-a-${f.id}`}
                onClick={() => toggle(f.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-semibold"
              >
                {f.question}
                <ChevronDown className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="panel"
                  id={`${base}-a-${f.id}`}
                  role="region"
                  aria-labelledby={`${base}-q-${f.id}`}
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduced ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3, ease: EASE_OUT }}
                  style={{ overflow: 'hidden' }}
                >
                  <p className="pb-5 pr-9 text-ink/85">{f.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
