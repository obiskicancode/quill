import type { ReactNode } from 'react';

interface BookingDocProps {
  /** Spoken when the booking changes underneath the guest, never as a page reload. */
  announcement: string;
  /** Above the status: the signed-in window for a manage session. */
  session?: ReactNode;
  status: ReactNode;
  /** Things that are only true for a moment — a failed refresh, an unpaid date change. */
  notices?: ReactNode;
  /** Everything the guest can do from here. */
  actions: ReactNode;
  /** The stay and its money, side by side. */
  facts: ReactNode;
  /** What happens next, or what has already happened. */
  story: ReactNode;
  /** Reading material: directions, policies, extras. Kept below a rule so it stays secondary. */
  reference?: ReactNode;
  help: ReactNode;
  /** The printed voucher — the only part of the page that survives on paper. */
  print: ReactNode;
}

/**
 * The spine both post-booking pages share. One document about one booking: where
 * it stands, what you can do, what it costs, what happens next — and only then the
 * reference material, quieter and behind a rule.
 */
export function BookingDoc({
  announcement,
  session,
  status,
  notices,
  actions,
  facts,
  story,
  reference,
  help,
  print,
}: BookingDocProps) {
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="container-page max-w-5xl space-y-8 py-8 md:py-12 print:hidden">
        {session}
        {status}
        {notices}
        {actions}
        {facts}
        {story}
        {reference && (
          <div className="space-y-6 border-t border-line pt-8">{reference}</div>
        )}
      </div>
      <div className="print:hidden">
        {help}
        <div className="h-16" aria-hidden />
      </div>
      {print}
    </>
  );
}
