import type { ManageData, PendingChangeView } from '@/types/manage.types';

import type { StoredReservation } from '../booking/store';
import { getCheckoutSettings } from '../checkout/settings';
import type { Clock } from '../stay-quote';
import { timelineFrom } from './labels';
import { allowedActions, previewCancellation } from './rules';
import { getManageSettings } from './settings';

export async function buildManageData(
  r: StoredReservation,
  session: { csrf: string; expiresAt: number },
  clock: Clock,
): Promise<ManageData> {
  const settings = await getManageSettings();
  const allowed = allowedActions(r, clock, settings);
  const pc = r.pendingChange;
  const checkout = await getCheckoutSettings();
  const pendingChange: PendingChangeView | null = pc
    ? {
        changeId: pc.changeId,
        checkIn: pc.checkIn,
        checkOut: pc.checkOut,
        amountDueMinor: pc.amountDueMinor,
        holdExpiresAt: new Date(pc.holdExpiresAt).toISOString(),
        status: pc.status,
        method: pc.method,
        bank:
          pc.status === 'awaiting_transfer'
            ? { details: checkout.bank, amountMinor: pc.amountDueMinor }
            : null,
        acceptedMethods: checkout.acceptedMethods,
        providerName: r.snapshot.providerName,
      }
    : null;

  return {
    csrfToken: session.csrf,
    sessionExpiresAt: new Date(session.expiresAt).toISOString(),
    allowed,
    timeline: timelineFrom(r.history),
    cancellation: allowed.canCancel.allowed
      ? previewCancellation(r, clock, settings)
      : null,
    pendingChange,
    contact: { email: r.guest.email, phone: r.guest.phone },
    editable: {
      fullName: r.guest.fullName,
      phone: r.guest.phone,
      country: r.guest.country,
      arrivalTime: r.guest.arrivalTime,
      specialRequests: r.guest.specialRequests,
    },
  };
}
