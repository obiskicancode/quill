import { CheckoutShell } from '@/components/checkout/CheckoutShell'
import { ConfirmationSkeleton } from '@/components/booking/ConfirmationSkeleton'

export default function ConfirmationLoading() {
  return (
    <CheckoutShell label="Your booking" backToHome>
      <ConfirmationSkeleton />
    </CheckoutShell>
  )
}
