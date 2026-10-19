import { ConfirmationSkeleton } from '@/components/booking/ConfirmationSkeleton';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';

export default function ManageLoading() {
  return (
    <CheckoutShell label="Manage booking" backToHome>
      <ConfirmationSkeleton />
    </CheckoutShell>
  );
}
