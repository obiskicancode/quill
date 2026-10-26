import { AdminCard } from '@/components/admin/AdminCard';
import { formatNaira } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

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
          <h4 className="text-caption text-muted font-semibold tracking-wider uppercase">
            Nightly inventory rates ({reservation.nightsList.length} nights)
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="text-small w-full text-left">
              <caption className="sr-only">List of nightly room rates</caption>
              <thead className="border-line text-caption text-muted border-b font-medium">
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
              <tbody className="divide-line divide-y">
                {reservation.nightsList.map((n) => (
                  <tr key={n.id}>
                    <td className="text-ink py-2.5 font-medium">{n.date}</td>
                    <td className="text-caption text-muted py-2.5">
                      {n.ruleName ?? 'Standard base rate'}
                    </td>
                    <td className="text-ink py-2.5 text-right font-semibold">
                      {formatNaira(n.rateMinor / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extras Table */}
        {reservation.extrasList.length > 0 && (
          <div className="border-line border-t pt-3">
            <h4 className="text-caption text-muted font-semibold tracking-wider uppercase">
              Add-on extras ({reservation.extrasList.length})
            </h4>
            <div className="mt-2 overflow-x-auto">
              <table className="text-small w-full text-left">
                <caption className="sr-only">
                  List of booking add-on extras
                </caption>
                <thead className="border-line text-caption text-muted border-b font-medium">
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
                <tbody className="divide-line divide-y">
                  {reservation.extrasList.map((e) => (
                    <tr key={e.id}>
                      <td className="text-ink py-2.5 font-medium">{e.name}</td>
                      <td className="text-muted py-2.5">{e.quantity}</td>
                      <td className="text-muted py-2.5">
                        {formatNaira(e.unitPriceMinor / 100)}
                      </td>
                      <td className="text-ink py-2.5 text-right font-semibold">
                        {formatNaira(e.totalMinor / 100)}
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
