'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  usePriceCalendar,
  usePricingQuote,
  type PricingQuoteInput,
} from '@/hooks/services/admin/use-inventory';
import { addDays, todayISO } from '@/lib/dates';
import { minorToNaira } from '@/lib/rate-resolution';

import { priceQuoteFormSchema } from './form-schemas';

interface TabPricePreviewProps {
  roomTypeId: string;
}

type PriceQuoteFormInput = z.input<typeof priceQuoteFormSchema>;
type PriceQuoteFormOutput = z.output<typeof priceQuoteFormSchema>;

export function TabPricePreview({ roomTypeId }: TabPricePreviewProps) {
  const today = todayISO();
  const calendarQuery = usePriceCalendar(roomTypeId, today, 90);
  const calendarDays = calendarQuery.data ?? [];

  // Month navigation
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0); // 0 = first 30 days, 1 = next 30, 2 = next 30

  // Stay Calculator State
  const [quoteInput, setQuoteInput] = useState<PricingQuoteInput | null>(null);
  const [localCalcError, setLocalCalcError] = useState<string | null>(null);

  const quoteQuery = usePricingQuote(quoteInput);
  const quoteResult = quoteQuery.data ?? null;
  const calculating = quoteQuery.isFetching;

  const form = useForm<PriceQuoteFormInput, unknown, PriceQuoteFormOutput>({
    resolver: zodResolver(priceQuoteFormSchema),
    defaultValues: {
      checkIn: today,
      checkOut: addDays(today, 2),
      adults: 2,
      children: 0,
      extraBed: false,
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  async function handleCalculateStay(input: PriceQuoteFormOutput) {
    setLocalCalcError(null);
    const payload: PricingQuoteInput = {
      roomTypeId,
      ...input,
    };

    const isSame =
      quoteInput !== null &&
      quoteInput.roomTypeId === payload.roomTypeId &&
      quoteInput.checkIn === payload.checkIn &&
      quoteInput.checkOut === payload.checkOut &&
      quoteInput.adults === payload.adults &&
      quoteInput.children === payload.children &&
      quoteInput.extraBed === payload.extraBed;

    if (isSame) {
      await quoteQuery.refetch();
      return;
    }

    setQuoteInput(payload);
  }

  // Slice into 30-day views
  const displaySlice = calendarDays.slice(
    currentMonthIndex * 30,
    (currentMonthIndex + 1) * 30,
  );
  const calcError = quoteQuery.isError
    ? quoteQuery.error instanceof Error
      ? quoteQuery.error.message
      : ERROR_MESSAGES.CALCULATION_ERROR
    : localCalcError;

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

        {calendarQuery.isLoading ? (
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

        <form
          onSubmit={handleSubmit(handleCalculateStay)}
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
          noValidate
        >
          <Field
            id="preview-checkin"
            label="Check-In"
            error={errors.checkIn?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="date"
                className={inputClass(errors.checkIn?.message)}
                {...register('checkIn')}
              />
            )}
          </Field>

          <Field
            id="preview-checkout"
            label="Check-Out"
            error={errors.checkOut?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="date"
                className={inputClass(errors.checkOut?.message)}
                {...register('checkOut')}
              />
            )}
          </Field>

          <Field
            id="preview-adults"
            label="Adults"
            error={errors.adults?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min="1"
                className={inputClass(errors.adults?.message)}
                {...register('adults', { valueAsNumber: true })}
              />
            )}
          </Field>

          <Field
            id="preview-children"
            label="Children"
            error={errors.children?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min="0"
                className={inputClass(errors.children?.message)}
                {...register('children', { valueAsNumber: true })}
              />
            )}
          </Field>

          <div className="flex flex-col justify-end space-y-1.5">
            <div className="flex items-center gap-2 pb-1.5">
              <Controller
                control={control}
                name="extraBed"
                render={({ field }) => (
                  <Checkbox
                    id="preview-extra-bed"
                    name={field.name}
                    ref={field.ref}
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    onBlur={field.onBlur}
                  />
                )}
              />
              <Label
                htmlFor="preview-extra-bed"
                className="cursor-pointer text-xs"
              >
                Extra Bed
              </Label>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={calculating}
              loading={calculating}
              className="w-full"
            >
              Calculate Quote
            </Button>
          </div>
        </form>

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

        {!quoteResult && quoteInput !== null && !calculating && !calcError && (
          <p className="text-small text-muted-foreground mt-4">
            {ERROR_MESSAGES.INVALID_QUOTE_OR_PARAMS}
          </p>
        )}
      </section>
    </div>
  );
}
