import type { ReactNode } from 'react'

interface SectionHeadingProps {
  id: string
  title: string
  intro?: string
  action?: ReactNode
}

/** Heading, optional one-line intro, and one optional action on the right. Wraps cleanly with long staff-written text. */
export function SectionHeading({ id, title, intro, action }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 md:mb-14">
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-h2 text-balance">
          {title}
        </h2>
        {intro && <p className="mt-3 text-body-lg opacity-80">{intro}</p>}
      </div>
      {action}
    </div>
  )
}
