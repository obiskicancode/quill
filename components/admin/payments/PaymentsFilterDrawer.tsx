'use client';

import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { PaymentsQueryParams } from '@/types/payments.types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
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

export function PaymentsFilterDrawer({
  filters,
  onChange,
  onReset,
}: {
  filters: PaymentsQueryParams;
  onChange: (patch: Partial<PaymentsQueryParams>) => void;
  onReset: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeChips: { key: keyof PaymentsQueryParams; label: string }[] = [];
  if (filters.status !== 'all')
    activeChips.push({ key: 'status', label: `Status: ${filters.status}` });
  if (filters.type !== 'all')
    activeChips.push({ key: 'type', label: `Type: ${filters.type}` });
  if (filters.provider !== 'all')
    activeChips.push({
      key: 'provider',
      label: `Provider: ${filters.provider}`,
    });
  if (filters.method !== 'all')
    activeChips.push({ key: 'method', label: `Method: ${filters.method}` });
  if (filters.reconciled !== 'all')
    activeChips.push({
      key: 'reconciled',
      label: `Reconciled: ${filters.reconciled}`,
    });
  if (filters.q)
    activeChips.push({ key: 'q', label: `Search: "${filters.q}"` });

  return (
    <div className="space-y-2">
      {/* Search and primary bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
              : 'outline'
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
        <div className="hidden items-center gap-2 lg:flex">
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
          variant="outline"
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
              className="border-line bg-paper text-caption text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5"
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
                className="hover:text-destructive size-4 p-0 hover:bg-transparent"
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
            className="text-destructive ml-1"
          >
            Clear all
          </Button>
        </div>
      )}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="border-line bg-card max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl border-t p-0 lg:hidden"
        >
          <SheetHeader className="border-line border-b p-5 pr-14">
            <SheetTitle className="text-ink">Payment Filters</SheetTitle>
            <SheetDescription>
              Narrow the payment ledger by status, provider, method, or
              reconciliation state.
            </SheetDescription>
          </SheetHeader>

          <div className="text-small space-y-4 p-5">
            {activeChips.length > 0 && (
              <Alert className="bg-muted/40 border-line text-caption">
                {activeChips.length} active filter
                {activeChips.length === 1 ? '' : 's'} applied.
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="payments-status" className="text-caption">
                Status
              </Label>
              <Select
                items={STATUS_OPTIONS}
                value={filters.status}
                onValueChange={(val) => {
                  if (val) {
                    onChange({
                      status: val as PaymentsQueryParams['status'],
                    });
                  }
                }}
              >
                <SelectTrigger id="payments-status" className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payments-provider" className="text-caption">
                Provider
              </Label>
              <Select
                items={PROVIDER_OPTIONS}
                value={filters.provider}
                onValueChange={(val) => {
                  if (val) {
                    onChange({
                      provider: val as PaymentsQueryParams['provider'],
                    });
                  }
                }}
              >
                <SelectTrigger id="payments-provider" className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payments-method" className="text-caption">
                Payment Method
              </Label>
              <Select
                items={METHOD_OPTIONS}
                value={filters.method}
                onValueChange={(val) => {
                  if (val) {
                    onChange({
                      method: val as PaymentsQueryParams['method'],
                    });
                  }
                }}
              >
                <SelectTrigger id="payments-method" className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payments-reconciled" className="text-caption">
                Reconciliation State
              </Label>
              <Select
                items={RECONCILED_OPTIONS}
                value={filters.reconciled}
                onValueChange={(val) => {
                  if (val) {
                    onChange({
                      reconciled: val as PaymentsQueryParams['reconciled'],
                    });
                  }
                }}
              >
                <SelectTrigger id="payments-reconciled" className="w-full">
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
          </div>

          <div className="border-line bg-card sticky bottom-0 flex items-center gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onReset();
                setMobileOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => setMobileOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
