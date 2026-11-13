import { AdminCard } from '@/components/admin/AdminCard';
import { formatMinor } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

/** Nightly rates and selected extras for the reservation. */
export function RatesAndExtrasCard({
  reservation,
}: {
  reservation: ReservationDetail;
}) {
  return (
    <AdminCard title="Nightly rates and extras">
      <div className="space-y-5">
        {/* Nightly Rates Table */}
        <div>
          <h4 className="text-caption font-semibold tracking-wider text-muted-foreground uppercase">
            Nightly inventory rates ({reservation.nightsList.length} nights)
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-small">
              <caption className="sr-only">List of nightly room rates</caption>
              <thead className="border-b border-line text-caption font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2">
                    Date
                  </th>
                  <th scope="col" className="pb-2">
                    Rate rule
                  </th>
                  <th scope="col" className="pb-2 text-right">
                    Nightly price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reservation.nightsList.map((n) => (
                  <tr key={n.id}>
                    <td className="py-2.5 font-medium text-ink">{n.date}</td>
                    <td className="py-2.5 text-caption text-muted-foreground">
                      {n.ruleName ?? 'Standard base rate'}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-ink">
                      {formatMinor(n.rateMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extras Table */}
        {reservation.extrasList.length > 0 && (
          <div className="border-t border-line pt-3">
            <h4 className="text-caption font-semibold tracking-wider text-muted-foreground uppercase">
              Add-on extras ({reservation.extrasList.length})
            </h4>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-small">
                <caption className="sr-only">
                  List of booking add-on extras
                </caption>
                <thead className="border-b border-line text-caption font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-2">
                      Item
                    </th>
                    <th scope="col" className="pb-2">
                      Qty
                    </th>
                    <th scope="col" className="pb-2">
                      Unit price
                    </th>
                    <th scope="col" className="pb-2 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {reservation.extrasList.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2.5 font-medium text-ink">{e.name}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {e.quantity}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatMinor(e.unitPriceMinor)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-ink">
                        {formatMinor(e.totalMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
