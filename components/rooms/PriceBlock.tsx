import { textLinkClasses } from '@/components/ui/text-link';
import { formatNaira } from '@/lib/format';
import type { RoomAvailability, RoomType } from '@/types/rooms.types';

interface PriceBlockProps {
  room: Pick<RoomType, 'showPrice' | 'basePriceNgn' | 'taxesIncluded'>;
  availability: RoomAvailability | null;
  liveFailed?: boolean;
  pending?: boolean;
  onRetry?: () => void;
}

export function PriceBlock({
  room,
  availability,
  liveFailed = false,
  pending = false,
  onRetry,
}: PriceBlockProps) {
  if (!room.showPrice) {
    return (
      <div>
        <p className="font-display text-figure-sm">Contact us for price</p>
        <p className="mt-1 text-small text-muted-foreground">
          We will reply with rates for your dates.
        </p>
      </div>
    );
  }

  if (availability?.status === 'available') {
    const { totalNgn, nights, averageNgn, weekendNights } = availability;
    return (
      <div>
        <p>
          <span className="font-display text-figure">
            {formatNaira(totalNgn)}
          </span>
          <span className="text-small text-muted-foreground">
            {' '}
            for {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
        </p>
        <p className="mt-1 text-small text-muted-foreground">
          {formatNaira(averageNgn)} / night on average
        </p>
        <p className="text-small text-muted-foreground">
          {room.taxesIncluded ? 'Taxes included' : '+ taxes and fees'}
          {weekendNights > 0 && '. Includes weekend rates.'}
        </p>
      </div>
    );
  }

  return (
    <div className={pending ? 'animate-pulse' : undefined}>
      <p>
        <span className="text-small text-muted-foreground">From </span>
        <span className="font-display text-figure">
          {formatNaira(room.basePriceNgn)}
        </span>
        <span className="text-small text-muted-foreground"> / night</span>
      </p>
      {pending ? (
        <p className="mt-1 text-small text-muted-foreground">
          Checking rates for your dates.
        </p>
      ) : liveFailed ? (
        <div className="mt-1 space-y-1 text-small text-muted-foreground">
          <p>Starting rate. We could not get a price for your dates.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`${textLinkClasses} text-small`}
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <p className="mt-1 text-small text-muted-foreground">
          {room.taxesIncluded ? 'Taxes included' : '+ taxes and fees'}
        </p>
      )}
    </div>
  );
}
