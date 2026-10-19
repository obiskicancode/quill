import { ConfirmationSkeleton } from '@/components/booking/ConfirmationSkeleton';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';

export default function ConfirmationLoading() {
  return (
    <CheckoutShell label="Your booking" backToHome>
      <ConfirmationSkeleton />
    </CheckoutShell>
  );
}
