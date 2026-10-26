'use client';

import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import type { PaymentsQueryParams } from '@/types/payments-admin.types';

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
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search ref, guest name, provider ref..."
            value={filters.q || ''}
            onChange={(e) => onChange({ q: e.target.value, page: 1 })}
            className="border-line bg-surface text-small text-ink placeholder:text-muted focus:border-primary focus:ring-primary w-full rounded-md border py-1.5 pr-3 pl-9 focus:ring-1 focus:outline-none"
          />
        </div>

        {/* Quick shortcut: Needs reconciliation */}
        <button
          type="button"
          onClick={() => {
            onChange({
              status: 'paid',
              reconciled: 'no',
              page: 1,
            });
          }}
          className={`text-caption inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-semibold transition-colors ${
            filters.status === 'paid' && filters.reconciled === 'no'
              ? 'bg-primary text-primary-ink border-primary'
              : 'border-line bg-surface text-ink hover:bg-paper'
          }`}
        >
          <Filter className="size-3.5" />
          Needs Reconciliation
        </button>

        {/* Desktop inline dropdowns */}
        <div className="hidden items-center gap-2 lg:flex">
          <select
            value={filters.status}
            onChange={(e) =>
              onChange({
                status: e.target.value as PaymentsQueryParams['status'],
                page: 1,
              })
            }
            className="border-line bg-surface text-caption text-ink focus:border-primary rounded-md border px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={filters.method}
            onChange={(e) =>
              onChange({
                method: e.target.value as PaymentsQueryParams['method'],
                page: 1,
              })
            }
            className="border-line bg-surface text-caption text-ink focus:border-primary rounded-md border px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All methods</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="ussd">USSD</option>
          </select>

          <select
            value={filters.provider}
            onChange={(e) =>
              onChange({
                provider: e.target.value as PaymentsQueryParams['provider'],
                page: 1,
              })
            }
            className="border-line bg-surface text-caption text-ink focus:border-primary rounded-md border px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All providers</option>
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="stripe">Stripe</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
          </select>

          <select
            value={filters.reconciled}
            onChange={(e) =>
              onChange({
                reconciled: e.target.value as PaymentsQueryParams['reconciled'],
                page: 1,
              })
            }
            className="border-line bg-surface text-caption text-ink focus:border-primary rounded-md border px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All reconciliation</option>
            <option value="yes">Reconciled</option>
            <option value="no">Unreconciled</option>
          </select>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="border-line bg-surface text-caption text-ink inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium lg:hidden"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters {activeChips.length > 0 && `(${activeChips.length})`}
        </button>
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
              <button
                type="button"
                onClick={() => {
                  if (chip.key === 'q') onChange({ q: '' });
                  else
                    onChange({
                      [chip.key]: 'all',
                    } as Partial<PaymentsQueryParams>);
                }}
                className="hover:text-danger"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onReset}
            className="text-caption text-danger ml-1 font-semibold hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 lg:hidden">
          <div className="border-line bg-surface max-h-[85vh] space-y-4 overflow-y-auto rounded-t-2xl border-t p-5">
            <div className="border-line flex items-center justify-between border-b pb-3">
              <h3 className="text-ink font-semibold">Payment Filters</h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:text-ink p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-small space-y-3">
              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    onChange({
                      status: e.target.value as PaymentsQueryParams['status'],
                    })
                  }
                  className="border-line bg-paper w-full rounded-md border p-2"
                >
                  <option value="all">All statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Provider
                </label>
                <select
                  value={filters.provider}
                  onChange={(e) =>
                    onChange({
                      provider: e.target
                        .value as PaymentsQueryParams['provider'],
                    })
                  }
                  className="border-line bg-paper w-full rounded-md border p-2"
                >
                  <option value="all">All providers</option>
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                  <option value="stripe">Stripe</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Payment Method
                </label>
                <select
                  value={filters.method}
                  onChange={(e) =>
                    onChange({
                      method: e.target.value as PaymentsQueryParams['method'],
                    })
                  }
                  className="border-line bg-paper w-full rounded-md border p-2"
                >
                  <option value="all">All methods</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="ussd">USSD</option>
                </select>
              </div>

              <div>
                <label className="text-caption text-muted mb-1 block font-medium">
                  Reconciliation State
                </label>
                <select
                  value={filters.reconciled}
                  onChange={(e) =>
                    onChange({
                      reconciled: e.target
                        .value as PaymentsQueryParams['reconciled'],
                    })
                  }
                  className="border-line bg-paper w-full rounded-md border p-2"
                >
                  <option value="all">All</option>
                  <option value="yes">Reconciled</option>
                  <option value="no">Unreconciled</option>
                </select>
              </div>
            </div>

            <div className="border-line flex items-center justify-between gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setMobileOpen(false);
                }}
                className="border-line text-small text-muted hover:bg-paper flex-1 rounded-md border py-2 font-medium"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="bg-primary text-small text-primary-ink flex-1 rounded-md py-2 font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
