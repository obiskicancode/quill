'use client';

import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import { FilterSheetShell } from '@/components/admin/FilterSheetShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaymentsQueryParams } from '@/types/payments.types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'balance', label: 'Balance' },
  { value: 'full', label: 'Full payment' },
  { value: 'refund', label: 'Refund' },
];

const METHOD_OPTIONS = [
  { value: 'all', label: 'All methods' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'ussd', label: 'USSD' },
];

const PROVIDER_OPTIONS = [
  { value: 'all', label: 'All providers' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'flutterwave', label: 'Flutterwave' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
];

const RECONCILED_OPTIONS = [
  { value: 'all', label: 'All reconciliation' },
  { value: 'yes', label: 'Reconciled' },
  { value: 'no', label: 'Unreconciled' },
];

/** Chips say "Refunded", not "refunded". */
function optionLabel(
  options: { value: string; label: string }[],
  value: string | undefined,
) {
  return options.find((opt) => opt.value === value)?.label ?? value;
}

/** A labelled full-width select for the mobile filter sheet. */
function FilterField({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-caption">
        {label}
      </Label>
      <Select
        items={options}
        value={value}
        onValueChange={(val) => {
          if (val) onChange(val);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Mobile filter drawer for payment status, type, method and provider. */
export function PaymentsFilterDrawer({
  filters,
  onChange,
  onReset,
  resultCount,
}: {
  filters: PaymentsQueryParams;
  onChange: (patch: Partial<PaymentsQueryParams>) => void;
  onReset: () => void;
  /** How many transactions the current view matched; shown in the sheet. */
  resultCount?: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeChips: { key: keyof PaymentsQueryParams; label: string }[] = [];
  if (filters.status !== 'all')
    activeChips.push({
      key: 'status',
      label: `Status: ${optionLabel(STATUS_OPTIONS, filters.status)}`,
    });
  if (filters.type !== 'all')
    activeChips.push({
      key: 'type',
      label: `Type: ${optionLabel(TYPE_OPTIONS, filters.type)}`,
    });
  if (filters.provider !== 'all')
    activeChips.push({
      key: 'provider',
      label: `Provider: ${optionLabel(PROVIDER_OPTIONS, filters.provider)}`,
    });
  if (filters.method !== 'all')
    activeChips.push({
      key: 'method',
      label: `Method: ${optionLabel(METHOD_OPTIONS, filters.method)}`,
    });
  if (filters.reconciled !== 'all')
    activeChips.push({
      key: 'reconciled',
      label: `Reconciliation: ${optionLabel(RECONCILED_OPTIONS, filters.reconciled)}`,
    });
  if (filters.q)
    activeChips.push({ key: 'q', label: `Search: "${filters.q}"` });

  return (
    <div className="space-y-2">
      {/* Search and primary bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search payments"
            placeholder="Search ref, guest name, provider ref..."
            value={filters.q || ''}
            onChange={(e) => onChange({ q: e.target.value, page: 1 })}
            className="border-line bg-card pl-9"
          />
        </div>

        {/* Quick shortcut: Needs reconciliation */}
        <Button
          type="button"
          variant={
            filters.status === 'paid' && filters.reconciled === 'no'
              ? 'primary'
              : 'secondary'
          }
          size="sm"
          onClick={() => {
            onChange({
              status: 'paid',
              reconciled: 'no',
              page: 1,
            });
          }}
        >
          <Filter aria-hidden />
          Needs Reconciliation
        </Button>

        {/* Desktop inline dropdowns */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <Select
            items={STATUS_OPTIONS}
            value={filters.status}
            onValueChange={(val) => {
              if (val) {
                onChange({
                  status: val as PaymentsQueryParams['status'],
                  page: 1,
                });
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter by payment status"
              className="w-32.5"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={TYPE_OPTIONS}
            value={filters.type}
            onValueChange={(val) => {
              if (val) {
                onChange({
                  type: val as PaymentsQueryParams['type'],
                  page: 1,
                });
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter by payment type"
              className="w-31.25"
            >
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={METHOD_OPTIONS}
            value={filters.method}
            onValueChange={(val) => {
              if (val) {
                onChange({
                  method: val as PaymentsQueryParams['method'],
                  page: 1,
                });
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter by payment method"
              className="w-33.75"
            >
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={PROVIDER_OPTIONS}
            value={filters.provider}
            onValueChange={(val) => {
              if (val) {
                onChange({
                  provider: val as PaymentsQueryParams['provider'],
                  page: 1,
                });
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter by payment provider"
              className="w-35"
            >
              <SelectValue placeholder="All providers" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={RECONCILED_OPTIONS}
            value={filters.reconciled}
            onValueChange={(val) => {
              if (val) {
                onChange({
                  reconciled: val as PaymentsQueryParams['reconciled'],
                  page: 1,
                });
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter by reconciliation status"
              className="w-37.5"
            >
              <SelectValue placeholder="All reconciliation" />
            </SelectTrigger>
            <SelectContent>
              {RECONCILED_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile toggle */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden"
        >
          <SlidersHorizontal aria-hidden />
          Filters {activeChips.length > 0 && `(${activeChips.length})`}
        </Button>
      </div>

      {/* Removable chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-0.5 text-caption text-ink"
            >
              <span>{chip.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (chip.key === 'q') onChange({ q: '' });
                  else
                    onChange({
                      [chip.key]: 'all',
                    } as Partial<PaymentsQueryParams>);
                }}
                className="size-4 p-0 hover:bg-transparent hover:text-destructive"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="size-3" />
              </Button>
            </span>
          ))}

          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={onReset}
            className="ml-1 text-destructive"
          >
            Clear all
          </Button>
        </div>
      )}

      <FilterSheetShell
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        hiddenBelow="lg:hidden"
        title="Payment filters"
        description="Narrow the payment ledger by status, type, provider, method or reconciliation state."
        resultNoun="payment"
        resultCount={resultCount}
        onClearAll={onReset}
      >
        <FilterField
          id="sheet-payments-status"
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(val) =>
            onChange({ status: val as PaymentsQueryParams['status'], page: 1 })
          }
        />
        <FilterField
          id="sheet-payments-type"
          label="Type"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(val) =>
            onChange({ type: val as PaymentsQueryParams['type'], page: 1 })
          }
        />
        <FilterField
          id="sheet-payments-provider"
          label="Provider"
          options={PROVIDER_OPTIONS}
          value={filters.provider}
          onChange={(val) =>
            onChange({
              provider: val as PaymentsQueryParams['provider'],
              page: 1,
            })
          }
        />
        <FilterField
          id="sheet-payments-method"
          label="Payment method"
          options={METHOD_OPTIONS}
          value={filters.method}
          onChange={(val) =>
            onChange({ method: val as PaymentsQueryParams['method'], page: 1 })
          }
        />
        <FilterField
          id="sheet-payments-reconciled"
          label="Reconciliation state"
          options={RECONCILED_OPTIONS}
          value={filters.reconciled}
          onChange={(val) =>
            onChange({
              reconciled: val as PaymentsQueryParams['reconciled'],
              page: 1,
            })
          }
        />
      </FilterSheetShell>
    </div>
  );
}
