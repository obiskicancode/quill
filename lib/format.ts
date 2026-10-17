const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

/** 150000 becomes "₦150,000". */
export const formatNaira = (amount: number): string => naira.format(amount)

export function formatSecondary(currency: 'USD' | 'GBP' | 'EUR', amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
