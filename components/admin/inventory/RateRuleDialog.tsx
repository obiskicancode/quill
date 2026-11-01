'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCreateRateRule,
  useRateRuleOverlap,
  useUpdateRateRule,
} from '@/hooks/services/admin/use-inventory';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { bpsToPercentage, minorToNaira } from '@/lib/rate-resolution';
import type {
  AdminRateRule,
  AdminRoomTypeListItem,
  RateAdjustmentType,
  RateRuleInput,
} from '@/types/inventory.types';

import { rateRuleFormSchema } from './form-schemas';

interface RateRuleDialogProps {
  open: boolean;
  rule: AdminRateRule | null;
  roomTypes: AdminRoomTypeListItem[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const DAYS = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

type RateRuleFormInput = z.input<typeof rateRuleFormSchema>;
type RateRuleFormOutput = z.output<typeof rateRuleFormSchema>;

function defaultValues(rule: AdminRateRule | null): RateRuleFormInput {
  let adjustmentInput = '20';
  if (rule) {
    adjustmentInput =
      rule.adjustmentType === 'percent_markup'
        ? String(bpsToPercentage(rule.adjustmentValue))
        : minorToNaira(rule.adjustmentValue);
  }
  return {
    name: rule?.name || '',
    roomTypeId: rule?.roomTypeId || '',
    startDate: rule?.startDate || '',
    endDate: rule?.endDate || '',
    daysOfWeek: rule?.daysOfWeek || [],
    adjustmentType: rule?.adjustmentType || 'percent_markup',
    adjustmentInput,
    minNights: rule?.minNights ? String(rule.minNights) : '',
    maxNights: rule?.maxNights ? String(rule.maxNights) : '',
    priority: rule?.priority ?? 10,
    isActive: rule?.isActive ?? true,
  };
}

export function RateRuleDialog({
  open,
  rule,
  roomTypes,
  onClose,
  onSaved,
}: RateRuleDialogProps) {
  const isEditing = !!rule?.id;
  const createRateRule = useCreateRateRule();
  const updateRateRule = useUpdateRateRule();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RateRuleFormInput, unknown, RateRuleFormOutput>({
    resolver: zodResolver(rateRuleFormSchema),
    defaultValues: defaultValues(rule),
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError: setFieldError,
    setValue,
  } = form;

  const [
    name,
    roomTypeId,
    startDate,
    endDate,
    daysOfWeek,
    adjustmentType,
    priority,
    isActive,
  ] = useWatch({
    control,
    name: [
      'name',
      'roomTypeId',
      'startDate',
      'endDate',
      'daysOfWeek',
      'adjustmentType',
      'priority',
      'isActive',
    ],
  });

  const busy =
    isSubmitting || createRateRule.isPending || updateRateRule.isPending;

  const overlapPayload: RateRuleInput | null =
    startDate && endDate && endDate >= startDate
      ? {
          name: name || 'Test',
          roomTypeId: roomTypeId || null,
          startDate,
          endDate,
          adjustmentType,
          adjustmentValue: 100,
          priority: priority ?? 0,
          isActive: isActive ?? true,
        }
      : null;
  const overlapQuery = useRateRuleOverlap(overlapPayload);
  const overlapData = overlapQuery.data ?? null;

  function toggleDay(day: number) {
    const selectedDays = daysOfWeek ?? [];
    if (selectedDays.includes(day)) {
      setValue(
        'daysOfWeek',
        selectedDays.filter((value) => value !== day),
      );
    } else {
      setValue('daysOfWeek', [...selectedDays, day].sort());
    }
  }

  async function handleFormSubmit(input: RateRuleFormOutput) {
    setErrorMessage(null);

    const payload: RateRuleInput = {
      name: input.name,
      roomTypeId: input.roomTypeId ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      daysOfWeek: input.daysOfWeek ?? null,
      adjustmentType: input.adjustmentType,
      adjustmentValue: input.adjustmentValue,
      minNights: input.minNights ?? null,
      maxNights: input.maxNights ?? null,
      priority: input.priority,
      isActive: input.isActive,
    };

    try {
      if (isEditing && rule?.id) {
        await updateRateRule.mutateAsync({ id: rule.id, input: payload });
        toast.add({
          title: SUCCESS_MESSAGES.RATE_RULE_UPDATED,
          type: 'success',
        });
      } else {
        await createRateRule.mutateAsync(payload);
        toast.add({
          title: SUCCESS_MESSAGES.RATE_RULE_CREATED,
          type: 'success',
        });
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_RATE_RULE,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
    >
      <DialogContent className="rounded-card border-line bg-card max-h-[90vh] max-w-xl gap-0 overflow-y-auto border p-0 shadow-2xl sm:max-w-xl">
        <DialogHeader className="border-line border-b p-6 pr-14 pb-4">
          <DialogTitle className="text-h3 text-foreground font-semibold">
            {isEditing ? 'Edit Rate Rule' : 'New Rate Rule'}
          </DialogTitle>
          <DialogDescription className="text-caption text-muted-foreground">
            Configure seasonal pricing, occupancy adjustments, or long-stay
            discounts.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="text-small space-y-4 p-6"
          noValidate
        >
          {errorMessage && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10 text-destructive text-xs"
            >
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </Alert>
          )}

          {overlapData && overlapData.conflicts.length > 0 && (
            <Alert
              role="region"
              aria-label="Overlap warning"
              className="border-warning/40 bg-warning/10 text-xs"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert className="text-warning size-4 shrink-0" />
                <div>
                  <p className="text-warning-contrast font-semibold">
                    Overlap Guidance ({overlapData.conflicts.length} existing
                    rules in date range)
                  </p>
                  <p className="text-muted-foreground mt-1">
                    The rule with the highest priority wins. If priorities are
                    equal, a room-specific rule beats a property-wide rule.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {overlapData.conflicts.map((c) => (
                      <li
                        key={c.id}
                        className="text-muted-foreground flex justify-between"
                      >
                        <span>
                          {c.name} ({c.startDate} to {c.endDate})
                        </span>
                        <span
                          className={
                            c.equalPriority
                              ? 'text-warning-contrast font-semibold'
                              : ''
                          }
                        >
                          Priority {c.priority}{' '}
                          {c.equalPriority ? '(Equal!)' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Alert>
          )}

          <Field
            id="rule-name"
            label="Rule Name *"
            error={errors.name?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                placeholder="e.g. December Peak Holiday Uplift, Long Stay Discount"
                className={inputClass(errors.name?.message)}
                {...register('name')}
              />
            )}
          </Field>

          <Field
            id="rule-room-type"
            label="Applicable Room Type"
            error={errors.roomTypeId?.message}
          >
            {(a11y) => (
              <Controller
                control={control}
                name="roomTypeId"
                render={({ field }) => (
                  <Select
                    items={[
                      {
                        value: 'all',
                        label: 'All Room Types (Property-Wide)',
                      },
                      ...roomTypes.map((rt) => ({
                        value: rt.id,
                        label: rt.name,
                      })),
                    ]}
                    value={field.value || 'all'}
                    onValueChange={(value) =>
                      field.onChange(value === 'all' || !value ? '' : value)
                    }
                    disabled={busy}
                  >
                    <SelectTrigger
                      id={a11y.id}
                      aria-describedby={a11y['aria-describedby']}
                      aria-invalid={a11y['aria-invalid']}
                      onBlur={field.onBlur}
                      className="w-full"
                    >
                      <SelectValue placeholder="All Room Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Room Types (Property-Wide)
                      </SelectItem>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              id="rule-start-date"
              label="Start Date *"
              error={errors.startDate?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  className={inputClass(errors.startDate?.message)}
                  {...register('startDate')}
                />
              )}
            </Field>
            <Field
              id="rule-end-date"
              label="End Date *"
              error={errors.endDate?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  className={inputClass(errors.endDate?.message)}
                  {...register('endDate')}
                />
              )}
            </Field>
          </div>

          <div className="space-y-1.5">
            <Label>Days of Week (Leave all unchecked for everyday)</Label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {DAYS.map((d) => {
                const isSelected = (daysOfWeek || []).includes(d.day);
                return (
                  <Button
                    key={d.day}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => toggleDay(d.day)}
                    className="h-7 px-2.5"
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              id="rule-adjustment-type"
              label="Adjustment Type"
              error={errors.adjustmentType?.message}
            >
              {(a11y) => (
                <Controller
                  control={control}
                  name="adjustmentType"
                  render={({ field }) => (
                    <Select
                      items={[
                        {
                          value: 'percent_markup',
                          label: 'Percentage Markup / Discount (%)',
                        },
                        {
                          value: 'fixed_price',
                          label: 'Fixed Price Replacement (₦)',
                        },
                        {
                          value: 'amount_markup',
                          label: 'Fixed Amount Adjustment (₦)',
                        },
                      ]}
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) {
                          field.onChange(value as RateAdjustmentType);
                        }
                      }}
                      disabled={busy}
                    >
                      <SelectTrigger
                        id={a11y.id}
                        aria-describedby={a11y['aria-describedby']}
                        aria-invalid={a11y['aria-invalid']}
                        onBlur={field.onBlur}
                        className="w-full"
                      >
                        <SelectValue placeholder="Select adjustment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent_markup">
                          Percentage Markup / Discount (%)
                        </SelectItem>
                        <SelectItem value="fixed_price">
                          Fixed Price Replacement (₦)
                        </SelectItem>
                        <SelectItem value="amount_markup">
                          Fixed Amount Adjustment (₦)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>

            <Field
              id="rule-adjustment-value"
              label={
                adjustmentType === 'percent_markup'
                  ? 'Percentage (% e.g. 20 or -15)'
                  : 'Value in Naira (₦)'
              }
              error={errors.adjustmentInput?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="text"
                  placeholder={
                    adjustmentType === 'percent_markup' ? '20' : '90,000'
                  }
                  className={inputClass(errors.adjustmentInput?.message)}
                  {...register('adjustmentInput')}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              id="rule-min-nights"
              label="Min Stay Nights (Optional)"
              error={errors.minNights?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  className={inputClass(errors.minNights?.message)}
                  {...register('minNights')}
                />
              )}
            </Field>
            <Field
              id="rule-max-nights"
              label="Max Stay Nights (Optional)"
              error={errors.maxNights?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  min="1"
                  placeholder="e.g. 14"
                  className={inputClass(errors.maxNights?.message)}
                  {...register('maxNights')}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 items-center gap-4 pt-1">
            <Field
              id="rule-priority"
              label="Priority Integer (Higher wins)"
              error={errors.priority?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  className={inputClass(errors.priority?.message)}
                  {...register('priority', { valueAsNumber: true })}
                />
              )}
            </Field>

            <div className="flex items-center gap-2.5 pt-5">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Checkbox
                    id="ruleActive"
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
              <Label htmlFor="ruleActive" className="cursor-pointer">
                Rule is Active
              </Label>
            </div>
          </div>

          <DialogFooter className="border-line border-t bg-transparent px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={busy}>
              {isEditing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
