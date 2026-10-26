import { AdminCard } from '@/components/admin/AdminCard';
import { formatNaira } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

export function PriceBreakdownCard({
  reservation,
}: {
  reservation: ReservationDetail;
}) {
  return (
    <AdminCard title="Price breakdown">
      <dl className="text-small space-y-2.5">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Room subtotal</dt>
          <dd className="text-ink font-medium">
            {formatNaira(reservation.subtotalMinor / 100)}
          </dd>
        </div>

        {reservation.extrasMinor > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Extras</dt>
            <dd className="text-ink font-medium">
              +{formatNaira(reservation.extrasMinor / 100)}
            </dd>
          </div>
        )}

        {reservation.discountMinor > 0 && (
          <div className="text-success flex items-center justify-between">
            <dt>Discount</dt>
            <dd className="font-medium">
              -{formatNaira(reservation.discountMinor / 100)}
            </dd>
          </div>
        )}

        {reservation.serviceChargeMinor > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Service charge</dt>
            <dd className="text-ink font-medium">
              +{formatNaira(reservation.serviceChargeMinor / 100)}
            </dd>
          </div>
        )}

        {reservation.taxMinor > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Taxes (VAT)</dt>
            <dd className="text-ink font-medium">
              +{formatNaira(reservation.taxMinor / 100)}
            </dd>
          </div>
        )}

        <div className="border-line text-body text-ink flex items-center justify-between border-t pt-2 font-bold">
          <dt>Total stay cost</dt>
          <dd>{formatNaira(reservation.totalMinor / 100)}</dd>
        </div>

        {reservation.depositRequiredMinor > 0 && (
          <div className="text-caption text-muted-foreground flex items-center justify-between">
            <dt>Deposit required</dt>
            <dd>{formatNaira(reservation.depositRequiredMinor / 100)}</dd>
          </div>
        )}

        <div className="border-line/60 flex items-center justify-between border-t pt-2">
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="text-success font-semibold">
            {formatNaira(reservation.amountPaidMinor / 100)}
          </dd>
        </div>

        {reservation.amountRefundedMinor > 0 && (
          <div className="text-destructive flex items-center justify-between">
            <dt>Amount refunded</dt>
            <dd className="font-semibold">
              -{formatNaira(reservation.amountRefundedMinor / 100)}
            </dd>
          </div>
        )}

        <div className="border-line text-body flex items-center justify-between border-t pt-2">
          <dt className="text-ink font-bold">Balance due</dt>
          <dd
            className={`font-bold ${
              reservation.balanceMinor > 0 ? 'text-destructive' : 'text-success'
            }`}
          >
            {formatNaira(reservation.balanceMinor / 100)}
          </dd>
        </div>
      </dl>
    </AdminCard>
  );
}
