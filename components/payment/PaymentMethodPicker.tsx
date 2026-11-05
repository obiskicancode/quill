'use client';

import { CreditCard, Landmark } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PaymentMethod, PaymentProvider } from '@/types/checkout.types';

import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

export const providerNames: Record<PaymentProvider, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  stripe: 'Stripe',
};

const copy: Record<
  PaymentMethod,
  { title: string; icon: typeof CreditCard; text: (x: string) => string }
> = {
  online: {
    title: 'Card or USSD',
    icon: CreditCard,
    text: (provider) =>
      `You pay on ${provider}'s secure page. We never see your card details.`,
  },
  bank_transfer: {
    title: 'Bank transfer',
    icon: Landmark,
    text: () =>
      'Transfer to the hotel and upload your receipt. We confirm once the hotel verifies it.',
  },
};

/** The order the guest reads them in, whatever order the server sent. */
const ORDER: PaymentMethod[] = ['online', 'bank_transfer'];

interface PaymentMethodPickerProps {
  methods: PaymentMethod[];
  value: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  /** The hosted-checkout provider, named so the guest knows who takes their card. */
  providerName: string;
  /** Prefixes the input ids and the group label; must be unique on the page. */
  idPrefix: string;
  disabled?: boolean;
}

/**
 * The choice between card/USSD and bank transfer, shared by checkout, a date
 * change and the receipt page. It never collects card data: "Card or USSD"
 * opens the provider's own checkout.
 */
export function PaymentMethodPicker({
  methods,
  value,
  onMethod,
  providerName,
  idPrefix,
  disabled = false,
}: PaymentMethodPickerProps) {
  const labelId = `${idPrefix}-label`;
  const options = ORDER.filter((m) => methods.includes(m));
  return (
    <div className="space-y-3">
      <p id={labelId} className="font-semibold">
        {options.length === 1 ? 'Payment method' : 'How would you like to pay?'}
      </p>
      <RadioGroup
        value={value}
        onValueChange={(val) => onMethod(val as PaymentMethod)}
        aria-labelledby={labelId}
        disabled={disabled}
        className="gap-3"
      >
        {options.map((m) => {
          const { title, icon: Icon, text } = copy[m];
          const id = `${idPrefix}-${m}`;
          const selected = value === m;
          return (
            <Label
              key={m}
              htmlFor={id}
              className={cn(
                'flex min-h-14 cursor-pointer items-start gap-3 rounded-card border p-4 font-normal transition-colors',
                // A ring, not a thicker border: the card must not shift under the guest's pointer.
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-ink/40 bg-card hover:bg-paper',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <RadioGroupItem
                value={m}
                id={id}
                disabled={disabled}
                className="mt-1"
              />
              <span className="mt-0.5 text-brand-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-small text-muted-foreground">
                  {text(providerName)}
                </span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
