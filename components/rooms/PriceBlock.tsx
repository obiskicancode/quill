import { formatNaira } from '@/lib/format';
import type { RoomAvailability, RoomType } from '@/types/rooms.types';

interface PriceBlockProps {
  room: Pick<RoomType, 'showPrice' | 'basePriceNgn' | 'taxesIncluded'>;
  availability: RoomAvailability | null;
  liveFailed?: boolean;
}

export function PriceBlock({
  room,
  availability,
  liveFailed = false,
}: PriceBlockProps) {
  if (!room.showPrice) {
    return (
      <div className="">
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
      <div>
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
    <div>
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
