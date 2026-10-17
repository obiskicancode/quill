'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface FlowDialogProps {
  open: boolean
  onClose: () => void
  title: string
  /** false while a request is running: Esc and the close button are disabled so an action cannot be abandoned half-way. */
  dismissible?: boolean
  children: ReactNode
}

/**
 * Modal on desktop, full-screen sheet on mobile. A native <dialog>: focus is trapped inside, Esc closes it,
 * and focus returns to the button that opened it.
 */
export function FlowDialog({ open, onClose, title, dismissible = true, children }: FlowDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

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
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault()
      }}
      className="m-auto max-h-[90dvh] w-[min(42rem,calc(100vw-2rem))] rounded-card bg-paper p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-screen max-md:max-w-none max-md:rounded-none"
    >
      {open && (
        <>
          <div className="flex items-center justify-between border-b border-line px-5 py-3 md:px-6">
            <h2 id={titleId} className="font-display text-h3">{title}</h2>
            <button type="button" aria-label="Close" disabled={!dismissible} onClick={() => ref.current?.close()} className="grid size-11 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-40">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-6">{children}</div>
        </>
      )}
    </dialog>
  )
}
