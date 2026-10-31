import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_30rem]">
      <section className="on-dark bg-ink text-paper hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <Link href="/" className="font-display text-h3">
          Divine <span className="text-brand">Excellent</span>
        </Link>
        <div className="max-w-md">
          <p className="font-display text-h2">
            The quiet control room behind every good stay.
          </p>
          <p className="text-body mt-4 text-white/70">
            Reservations, availability and guest enquiries in one place, ready
            for the front desk.
          </p>
        </div>
        <p className="text-caption text-white/50">
          Staff access only. Activity is recorded in the audit log.
        </p>
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="font-display text-h3 mb-8 inline-block lg:hidden"
          >
            Divine <span className="text-brand-ink">Excellent</span>
          </Link>
          {children}
          <p className="border-line text-caption text-muted-foreground mt-8 border-t pt-4">
            Need help? Contact the owner or manager. Do not share passwords or
            authenticator codes.
          </p>
        </div>
      </section>
    </div>
  );
}
