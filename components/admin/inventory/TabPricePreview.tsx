'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { addDays, todayISO } from '@/lib/dates';
import { minorToNaira } from '@/lib/rate-resolution';
import type { CheckoutQuoteResponse } from '@/types/checkout.types';
import type { PriceCalendarDay } from '@/types/inventory.types';

interface TabPricePreviewProps {
  roomTypeId: string;
}

export function TabPricePreview({ roomTypeId }: TabPricePreviewProps) {
  const [calendarDays, setCalendarDays] = useState<PriceCalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  // Month navigation
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0); // 0 = first 30 days, 1 = next 30, 2 = next 30

  // Stay Calculator State
  const today = todayISO();
  const [calcCheckIn, setCalcCheckIn] = useState(today);
  const [calcCheckOut, setCalcCheckOut] = useState(addDays(today, 2));
  const [calcAdults, setCalcAdults] = useState(2);
  const [calcChildren, setCalcChildren] = useState(0);
  const [calcExtraBed, setCalcExtraBed] = useState(false);

  const [calculating, setCalculating] = useState(false);
  const [quoteResult, setQuoteResult] = useState<CheckoutQuoteResponse | null>(
    null,
  );
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCalendar() {
      setLoadingCalendar(true);
      try {
        const res = await adminService.getPriceCalendar(roomTypeId, today, 90);
        if (res.data) {
          setCalendarDays(res.data);
        }
      } catch {
        // Handled silently
      } finally {
        setLoadingCalendar(false);
      }
    }
    loadCalendar();
  }, [roomTypeId, today]);

  async function handleCalculateStay() {
    setCalculating(true);
    setCalcError(null);
    try {
      const res = await adminService.previewPricingQuote({
        roomTypeId,
        checkIn: calcCheckIn,
        checkOut: calcCheckOut,
        adults: calcAdults,
        children: calcChildren,
        extraBed: calcExtraBed,
      });

      if (res.data) {
        setQuoteResult(res.data);
      } else {
        setCalcError(ERROR_MESSAGES.INVALID_QUOTE_OR_PARAMS);
      }
    } catch (err) {
      setCalcError(
        err instanceof Error ? err.message : ERROR_MESSAGES.CALCULATION_ERROR,
      );
    } finally {
      setCalculating(false);
    }
  }

  // Slice into 30-day views
  const displaySlice = calendarDays.slice(
    currentMonthIndex * 30,
    (currentMonthIndex + 1) * 30,
  );

  return (
    <div className="space-y-8">
      {/* 90-Day Resolved Price Calendar */}
      <section className="rounded-card border-line bg-card border p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-foreground text-h3 font-semibold">
              90-Day Nightly Rate Calendar
            </h2>
            <p className="text-small text-muted-foreground">
              Live resolution of base rates, weekend uplifts, and active rate
              rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentMonthIndex === 0}
              onClick={() => setCurrentMonthIndex((prev) => prev - 1)}
              aria-label="Previous 30 days"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-foreground text-xs font-medium">
              Days {currentMonthIndex * 30 + 1}–{(currentMonthIndex + 1) * 30}{' '}
              of 90
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentMonthIndex === 2}
              onClick={() => setCurrentMonthIndex((prev) => prev + 1)}
              aria-label="Next 30 days"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {loadingCalendar ? (
          <div className="flex justify-center p-8">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10">
            {displaySlice.map((day) => {
              const hasRule = day.winningRule !== null;
              return (
                <div
                  key={day.date}
                  className={`flex flex-col justify-between rounded border p-2 text-xs transition-colors ${
                    hasRule
                      ? 'border-brand/40 bg-brand/5'
                      : day.isWeekend
                        ? 'border-line bg-paper/60'
                        : 'bg-background border-line'
                  }`}
                  title={
                    hasRule
                      ? `Rule: ${day.winningRule?.name} (${day.winningRule?.adjustmentType})`
                      : day.isWeekend
                        ? 'Weekend rate'
                        : 'Standard base rate'
                  }
                >
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>{day.date.slice(5)}</span>
                    {day.isWeekend && (
                      <span className="text-brand font-semibold">Wknd</span>
                    )}
                  </div>

                  <div className="mt-2">
                    <span className="text-foreground font-semibold">
                      ₦{minorToNaira(day.resolvedRateMinor)}
                    </span>
                    {hasRule && (
                      <p className="text-brand truncate text-[0.625rem]">
                        {day.winningRule?.name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="bg-background border-line size-3 rounded border" />
            <span>Weekday Base</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="border-line bg-paper/60 size-3 rounded border" />
            <span>Weekend Rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="border-brand/40 bg-brand/5 size-3 rounded border" />
            <span>Active Rate Rule Applied</span>
          </div>
        </div>
      </section>

      {/* Live Stay Calculator */}
      <section className="rounded-card border-line bg-card border p-6 shadow-sm">
        <h2 className="text-foreground text-h3 font-semibold">
          Stay Calculator & Totals Preview
        </h2>
        <p className="text-small text-muted-foreground mt-1">
          Simulate a booking quote to verify nightly rates, taxes, and service
          charges via the shared pricing engine.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="preview-checkin">Check-In</Label>
            <Input
              id="preview-checkin"
              type="date"
              value={calcCheckIn}
              onChange={(e) => setCalcCheckIn(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preview-checkout">Check-Out</Label>
            <Input
              id="preview-checkout"
              type="date"
              value={calcCheckOut}
              onChange={(e) => setCalcCheckOut(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preview-adults">Adults</Label>
            <Input
              id="preview-adults"
              type="number"
              min="1"
              value={calcAdults}
              onChange={(e) => setCalcAdults(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preview-children">Children</Label>
            <Input
              id="preview-children"
              type="number"
              min="0"
              value={calcChildren}
              onChange={(e) =>
                setCalcChildren(parseInt(e.target.value, 10) || 0)
              }
            />
          </div>

          <div className="flex flex-col justify-end space-y-1.5">
            <div className="flex items-center gap-2 pb-1.5">
              <Checkbox
                id="preview-extra-bed"
                checked={calcExtraBed}
                onCheckedChange={(checked) => setCalcExtraBed(!!checked)}
              />
              <Label
                htmlFor="preview-extra-bed"
                className="cursor-pointer text-xs"
              >
                Extra Bed
              </Label>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleCalculateStay}
              disabled={calculating}
              loading={calculating}
              className="w-full"
            >
              Calculate Quote
            </Button>
          </div>
        </div>

        {calcError && (
          <p className="text-small text-destructive mt-4">{calcError}</p>
        )}

        {quoteResult && quoteResult.status === 'ok' && (
          <div className="rounded-card border-line bg-paper mt-6 border p-5">
            <h4 className="text-foreground font-semibold">Quote Breakdown</h4>
            <div className="text-small mt-4 space-y-2">
              <div className="text-muted-foreground flex justify-between">
                <span>
                  Room Subtotal ({quoteResult.breakdown.lines.length} nights)
                </span>
                <span className="text-foreground font-medium">
                  ₦{minorToNaira(quoteResult.breakdown.roomSubtotalMinor)}
                </span>
              </div>

              {quoteResult.breakdown.extraBed &&
                quoteResult.breakdown.extraBed.totalMinor > 0 && (
                  <div className="text-muted-foreground flex justify-between">
                    <span>Extra Bed</span>
                    <span className="text-foreground font-medium">
                      ₦{minorToNaira(quoteResult.breakdown.extraBed.totalMinor)}
                    </span>
                  </div>
                )}

              {quoteResult.breakdown.serviceChargeMinor > 0 && (
                <div className="text-muted-foreground flex justify-between">
                  <span>Service Charge</span>
                  <span className="text-foreground font-medium">
                    ₦{minorToNaira(quoteResult.breakdown.serviceChargeMinor)}
                  </span>
                </div>
              )}

              <div className="text-muted-foreground flex justify-between">
                <span>Taxes & VAT</span>
                <span className="text-foreground font-medium">
                  ₦{minorToNaira(quoteResult.breakdown.taxMinor)}
                </span>
              </div>

              <div className="text-foreground border-line flex justify-between border-t pt-2 text-base font-bold">
                <span>Total Quote</span>
                <span className="text-brand">
                  ₦{minorToNaira(quoteResult.breakdown.totalMinor)}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
