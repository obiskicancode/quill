import { CheckoutShell } from '@/components/checkout/CheckoutShell'
import { CheckoutSkeleton } from '@/components/checkout/CheckoutSkeleton'

export default function CheckoutLoading() {
  return (
    <CheckoutShell>
      <CheckoutSkeleton />
    </CheckoutShell>
  )
}
