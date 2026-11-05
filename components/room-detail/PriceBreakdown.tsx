import { textLinkRecipe } from '@/components/ui/text-link';
import { formatShort } from '@/lib/dates';
import { formatMinor } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PriceBreakdownQuote } from '@/types/checkout.types';

/** Display only. Every number comes from the server quote. Per-night rates open only when they differ. */
export function PriceBreakdown({ quote }: { quote: PriceBreakdownQuote }) {
  const { nights, lines, extraBed } = quote;
  const varies = new Set(lines.map((l) => l.rateMinor)).size > 1;
  const row = 'flex items-baseline justify-between gap-4';

  return (
    <div className="min-h-52">
      <dl className="space-y-3 text-small">
        <div>
          <div className={row}>
            <dt>
              {varies
                ? `${nights} ${nights === 1 ? 'night' : 'nights'}`
                : `${nights} ${nights === 1 ? 'night' : 'nights'} × ${formatMinor(lines[0].rateMinor)}`}
            </dt>
            <dd className="tabular-nums">
              {formatMinor(quote.roomSubtotalMinor)}
            </dd>
          </div>
          {varies && (
            <details className="mt-1">
              <summary
                className={cn(
                  textLinkRecipe,
                  'inline-flex min-h-11 cursor-pointer items-center',
                )}
              >
                See the rate for each night
              </summary>
              <ul className="mb-1 space-y-1 border-l-2 border-line pl-3">
                {lines.map((l) => (
                  <li key={l.date} className={row}>
                    <span>
                      {formatShort(l.date)}
                      {l.note && (
                        <span className="text-muted-foreground">
                          , {l.note}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">
                      {formatMinor(l.rateMinor)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {extraBed && (
          <div className={row}>
            <dt>
              Extra bed ({nights} ×{' '}
              {extraBed.perNightMinor === 0
                ? 'free'
                : formatMinor(extraBed.perNightMinor)}
              )
            </dt>
            <dd className="tabular-nums">{formatMinor(extraBed.totalMinor)}</dd>
          </div>
        )}

        {quote.extras?.map((e) => (
          <div key={e.id} className={row}>
            <dt>
              {e.name}
              {e.quantity > 1 ? ` × ${e.quantity}` : ''}{' '}
              <span className="text-muted-foreground">({e.unitLabel})</span>
            </dt>
            <dd className="tabular-nums">{formatMinor(e.totalMinor)}</dd>
          </div>
        ))}

        {quote.discount && (
          <div className={row}>
            <dt>{quote.discount.label}</dt>
            <dd className="tabular-nums">
              -{formatMinor(quote.discount.amountMinor)}
            </dd>
          </div>
        )}

        <div className={row}>
          <dt>Service charge ({quote.serviceChargePercent}%)</dt>
          <dd className="tabular-nums">
            {formatMinor(quote.serviceChargeMinor)}
          </dd>
        </div>

        {quote.otherLevy && (
          <div className={row}>
            <dt>
              {quote.otherLevy.label} ({quote.otherLevy.percent}%)
            </dt>
            <dd className="tabular-nums">
              {formatMinor(quote.otherLevy.amountMinor)}
            </dd>
          </div>
        )}

        <div className={row}>
          <dt>
            {quote.taxIncluded
              ? `Tax (${quote.taxPercent}%), already included`
              : `Tax (${quote.taxPercent}%)`}
          </dt>
          <dd className="tabular-nums">{formatMinor(quote.taxMinor)}</dd>
        </div>

        <div
          className={`${row} border-t border-line pt-3 text-body font-semibold`}
        >
          <dt>Total</dt>
          <dd className="font-display text-figure-sm tabular-nums">
            {formatMinor(quote.totalMinor)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-muted-foreground">
        {quote.taxIncluded
          ? 'The total includes tax. Nothing else is added at checkout.'
          : 'Tax is added to the total above. Nothing else is added at checkout.'}
      </p>
    </div>
  );
}

export function BreakdownSkeleton() {
  const bar = 'rounded-sm bg-ink/10 motion-safe:animate-pulse';
  return (
    <div aria-hidden className="min-h-52 space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex justify-between gap-4">
          <div className={`${bar} h-4 w-1/2`} />
          <div className={`${bar} h-4 w-1/5`} />
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-line pt-4">
        <div className={`${bar} h-6 w-1/4`} />
        <div className={`${bar} h-6 w-1/3`} />
      </div>
    </div>
  );
}
