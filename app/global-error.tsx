'use client'

import { useEffect } from 'react'
import { ButtonLink } from '@/components/ui/Button'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  return (
    <html lang="en-NG">
      <body>
        <main className="container-page section-y">
          <div className="max-w-xl">
            <h1 tabIndex={-1} id="gerr-title" className="font-display text-h2">
              Something went wrong
            </h1>
            <p className="mt-3 text-body-lg text-ink/85">
              We ran into a technical problem. Please try again in a few moments.
            </p>
            <div className="mt-8">
              <ButtonLink href="/">Back to home</ButtonLink>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
