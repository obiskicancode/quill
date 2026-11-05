import { AdminCard } from '@/components/admin/AdminCard';
import { formatMinor } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

export function PriceBreakdownCard({
  reservation,
}: {
  reservation: ReservationDetail;
}) {
  return (
    <AdminCard title="Price breakdown">
      <dl className="space-y-2.5 text-small">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Room subtotal</dt>
          <dd className="font-medium text-ink">
            {formatMinor(reservation.subtotalMinor)}
          </dd>
        </div>

        {reservation.extrasMinor > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Extras</dt>
            <dd className="font-medium text-ink">
              +{formatMinor(reservation.extrasMinor)}
            </dd>
          </div>
        )}

        {reservation.discountMinor > 0 && (
          <div className="flex items-center justify-between text-success">
            <dt>Discount</dt>
            <dd className="font-medium">
              -{formatMinor(reservation.discountMinor)}
            </dd>
          </div>
        )}

        {reservation.serviceChargeMinor > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Service charge</dt>
            <dd className="font-medium text-ink">
              +{formatMinor(reservation.serviceChargeMinor)}
            </dd>
          </div>
        )}

        {reservation.taxMinor > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Taxes (VAT)</dt>
            <dd className="font-medium text-ink">
              +{formatMinor(reservation.taxMinor)}
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line pt-2 text-body font-bold text-ink">
          <dt>Total stay cost</dt>
          <dd>{formatMinor(reservation.totalMinor)}</dd>
        </div>

        {reservation.depositRequiredMinor > 0 && (
          <div className="flex items-center justify-between text-caption text-muted-foreground">
            <dt>Deposit required</dt>
            <dd>{formatMinor(reservation.depositRequiredMinor)}</dd>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line/60 pt-2">
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="font-semibold text-success">
            {formatMinor(reservation.amountPaidMinor)}
          </dd>
        </div>

        {reservation.amountRefundedMinor > 0 && (
          <div className="flex items-center justify-between text-destructive">
            <dt>Amount refunded</dt>
            <dd className="font-semibold">
              -{formatMinor(reservation.amountRefundedMinor)}
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line pt-2 text-body">
          <dt className="font-bold text-ink">Balance due</dt>
          <dd
            className={`font-bold ${
              reservation.balanceMinor > 0 ? 'text-destructive' : 'text-success'
            }`}
          >
            {formatMinor(reservation.balanceMinor)}
          </dd>
        </div>
      </dl>
    </AdminCard>
  );
}
