import { formatNaira } from '@/lib/format';
import type { RoomAvailability, RoomType } from '@/types/rooms.types';

interface PriceBlockProps {
  room: Pick<RoomType, 'showPrice' | 'basePriceNgn' | 'taxesIncluded'>;
  /** Live result for the chosen dates, or null when there are none (or they could not be loaded). */
  availability: RoomAvailability | null;
  /** True when live prices failed to load, so a short note explains why only a starting rate shows. */
  liveFailed?: boolean;
}

/** Price states: contact us, stay total, and starting rate. */
export function PriceBlock({
  room,
  availability,
  liveFailed = false,
}: PriceBlockProps) {
  if (!room.showPrice) {
    return (
      <div className="min-h-[5.5rem]">
        <p className="font-display text-xl">Contact us for price</p>
        <p className="text-small text-muted-foreground mt-1">
          We will reply with rates for your dates.
        </p>
      </div>
    );
  }

  if (availability?.status === 'available') {
    const { totalNgn, nights, averageNgn, weekendNights } = availability;
    return (
      <div className="min-h-[5.5rem]">
        <p>
          <span className="font-display text-2xl">{formatNaira(totalNgn)}</span>
          <span className="text-small text-muted-foreground">
            {' '}
            for {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
        </p>
        <p className="text-small text-muted-foreground mt-1">
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
    <div className="min-h-[5.5rem]">
      <p>
        <span className="text-small text-muted-foreground">From </span>
        <span className="font-display text-2xl">
          {formatNaira(room.basePriceNgn)}
        </span>
        <span className="text-small text-muted-foreground"> / night</span>
      </p>
      {liveFailed ? (
        <p className="text-small text-muted-foreground mt-1">
          Starting rate. Live price for your dates is unavailable.
        </p>
      ) : (
        <p className="text-small text-muted-foreground mt-1">
          {room.taxesIncluded ? 'Taxes included' : '+ taxes and fees'}
        </p>
      )}
    </div>
  );
}
