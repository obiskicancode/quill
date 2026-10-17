'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { roomAmenityLabels, type RoomAmenityKey } from '@/lib/rooms'
import { RoomAmenityIcon } from '../rooms/RoomAmenityIcon'
import { Button } from '../ui/Button'

/** "Show all N amenities" opens a grouped list in a native modal dialog (focus trapped, Esc closes). */
export function AmenitiesModal({ total, groups }: { total: number; groups: { title: string; keys: RoomAmenityKey[] }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <Button variant="secondary" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Show all {total} amenities
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="amenities-modal-title"
        onClose={() => setOpen(false)}
        className="m-auto max-h-[85dvh] w-[min(36rem,calc(100vw-2rem))] rounded-card bg-paper p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col"
      >
        {open && (
          <>
            <div className="flex items-center justify-between border-b border-line px-6 py-3">
              <h2 id="amenities-modal-title" className="font-display text-h3">Amenities</h2>
              <button type="button" aria-label="Close amenities" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-ink/10">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto px-6 py-6">
              {groups.map((g) => (
                <section key={g.title} aria-label={g.title}>
                  <h3 className="font-semibold">{g.title}</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {g.keys.map((k) => (
                      <li key={k} className="flex items-center gap-3 text-small">
                        <RoomAmenityIcon name={k} className="size-5 text-accent-ink" />
                        {roomAmenityLabels[k]}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
