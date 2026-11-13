import {
  formatDeadline,
  formatGuestTime,
  formatMinor,
  pluralCount,
} from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import type { GuestReservation } from '@/types/booking.types';

/** Print-friendly booking voucher. */
export function PrintVoucher({ v }: { v: GuestReservation }) {
  const c = v.policy.cancellation;
  const cancel = c.nonRefundable
    ? 'Non-refundable'
    : c.freeCancellationUntil
      ? `Free cancellation until ${formatDeadline(c.freeCancellationUntil)}`
      : c.note;
  const row = 'flex justify-between gap-6 border-b border-black/20 py-1.5';
  return (
    <article
      className="print-voucher hidden print:block"
      aria-label="Booking voucher"
    >
      <header className="mb-4 flex items-end justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-small">Booking voucher</p>
          <h1 className="text-figure font-bold">{v.hotel.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-caption">Booking reference</p>
          <p className="text-figure font-bold tracking-wide">{v.reference}</p>
        </div>
      </header>
      <dl className="text-small">
        <div className={row}>
          <dt>Status</dt>
          <dd className="font-semibold">{v.payment.label}</dd>
        </div>
        <div className={row}>
          <dt>Guest</dt>
          <dd>{v.guest.fullName}</dd>
        </div>
        <div className={row}>
          <dt>Room</dt>
          <dd>
            {v.room.name}, {v.room.bedConfig}
          </dd>
        </div>
        <div className={row}>
          <dt>Dates</dt>
          <dd>
            {v.stay.checkIn && v.stay.checkOut
              ? `${formatRange(v.stay.checkIn, v.stay.checkOut)} (${pluralCount(v.stay.nights, 'night')})`
              : 'To be confirmed'}
          </dd>
        </div>
        <div className={row}>
          <dt>Check-in / check-out</dt>
          <dd>
            From {formatGuestTime(v.times.checkIn)} / by{' '}
            {formatGuestTime(v.times.checkOut)}
          </dd>
        </div>
        <div className={row}>
          <dt>Guests</dt>
          <dd>
            {pluralCount(v.stay.adults, 'adult')},{' '}
            {pluralCount(v.stay.children, 'child', 'children')}
          </dd>
        </div>
        <div className={row}>
          <dt>Total / paid / balance</dt>
          <dd>
            {formatMinor(v.amounts.totalMinor)} /{' '}
            {formatMinor(v.amounts.paidMinor)} /{' '}
            {formatMinor(v.amounts.balanceMinor)}
          </dd>
        </div>
        <div className={row}>
          <dt>Address</dt>
          <dd className="text-right">{v.hotel.addressLines.join(', ')}</dd>
        </div>
        <div className={row}>
          <dt>Reception</dt>
          <dd>
            {v.hotel.phoneDisplay}, {v.hotel.reception}
          </dd>
        </div>
      </dl>
      <section className="mt-4 text-small">
        <h2 className="font-bold">Policies</h2>
        <p className="mt-1">{cancel}</p>
        <p>{v.policy.checkInRules}</p>
        <p>{v.policy.checkOutRules}</p>
        {v.policy.idRequired && <p>{v.policy.idText}</p>}
      </section>
      <p className="mt-6 text-caption">
        Please show this voucher or your booking reference at check-in.
      </p>
    </article>
  );
}
