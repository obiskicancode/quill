import { ERROR_MESSAGES } from '@/constants/error-messages';
import type {
  CheckoutOverrides,
  CheckoutSettings,
  ExtraItem,
  PaymentMethod,
  PaymentMode,
  PaymentProvider,
} from '@/types/checkout.types';
import type { HotelPricingSettings } from '@/types/rooms.types';

import { mapExtra } from '../db/mappers/content.mapper';
import { getBankAccountRows, getHotelRow } from '../db/queries/content-data';
import { listExtras } from '../db/repositories/extras.repo';
import { getActivePaymentProviderId } from '../payments';
import { getPricingSettings } from '../rooms/detail';

export async function getCheckoutSettings(
  hotelOverride?: HotelPricingSettings,
): Promise<CheckoutSettings> {
  const [hotel, row, extraRows, bankRows] = await Promise.all([
    hotelOverride ? Promise.resolve(hotelOverride) : getPricingSettings(),
    getHotelRow(),
    listExtras(),
    getBankAccountRows(),
  ]);
  if (!row) throw new Error(ERROR_MESSAGES.HOTEL_SETTINGS_MISSING);
  const bank = bankRows[0];
  const rows = extraRows
    .map(mapExtra)
    .sort((a, b) => a.name.localeCompare(b.name));
  const methods: PaymentMethod[] = [];
  if (row.allowOnlinePayment) methods.push('online');
  if (row.allowBankTransfer) methods.push('bank_transfer');
  const provider: PaymentProvider = getActivePaymentProviderId();
  const manage = (row.manageSettings ?? {}) as CheckoutOverrides;
  const paymentMode: PaymentMode = manage.paymentMode ?? 'full';

  return {
    paymentMode,
    depositPercent: row.depositBps / 100,
    acceptedMethods: methods,
    provider,
    confirmationMode:
      row.confirmationModeDefault === 'manual' ? 'manual' : 'instant',
    holdSeconds: row.holdMinutes * 60,
    bank: {
      bankName: bank?.bankName ?? '',
      accountName: bank?.accountName ?? '',
      accountNumber: bank?.accountNumber ?? '',
    },
    extras: rows as ExtraItem[],
    discount:
      manage.discountPercent && manage.discountPercent > 0
        ? {
            label: manage.discountLabel ?? 'Direct booking discount',
            percent: manage.discountPercent,
          }
        : null,
    otherLevy:
      manage.levyPercent && manage.levyPercent > 0
        ? {
            label: manage.levyLabel ?? 'Tourism levy',
            percent: manage.levyPercent,
          }
        : null,
    checkInTime24: hotel.checkInTime,
    nonRefundable: row.cancellationPolicyType === 'non_refundable',
    freeCancellationHours: hotel.freeCancellationHours,
  };
}
