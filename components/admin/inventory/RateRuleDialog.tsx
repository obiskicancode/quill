'use client';

import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  bpsToPercentage,
  minorToNaira,
  nairaToMinor,
  percentageToBps,
} from '@/lib/rate-resolution';
import type {
  AdminRateRule,
  AdminRateRuleInput,
  AdminRoomTypeListItem,
  RateAdjustmentType,
  RateRuleOverlapResponse,
} from '@/types/inventory.types';

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

export function RateRuleDialog({
  open,
  rule,
  roomTypes,
  onClose,
  onSaved,
}: RateRuleDialogProps) {
  const isEditing = !!rule?.id;

  const [name, setName] = useState(rule?.name || '');
  const [roomTypeId, setRoomTypeId] = useState<string>(rule?.roomTypeId || '');
  const [startDate, setStartDate] = useState(rule?.startDate || '');
  const [endDate, setEndDate] = useState(rule?.endDate || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    rule?.daysOfWeek || [],
  );
  const [adjustmentType, setAdjustmentType] = useState<RateAdjustmentType>(
    rule?.adjustmentType || 'percent_markup',
  );
  const [inputValue, setInputValue] = useState<string>(() => {
    if (!rule) return '20';
    if (rule.adjustmentType === 'percent_markup') {
      return String(bpsToPercentage(rule.adjustmentValue));
    }
    return minorToNaira(rule.adjustmentValue);
  });
  const [minNights, setMinNights] = useState<string>(
    rule?.minNights ? String(rule.minNights) : '',
  );
  const [maxNights, setMaxNights] = useState<string>(
    rule?.maxNights ? String(rule.maxNights) : '',
  );
  const [priority, setPriority] = useState<number>(rule?.priority ?? 10);
  const [isActive, setIsActive] = useState<boolean>(rule?.isActive ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overlap guidance
  const [overlapData, setOverlapData] =
    useState<RateRuleOverlapResponse | null>(null);

  // Check overlap when dates change
  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) {
      const payload: AdminRateRuleInput = {
        name: name || 'Test',
        roomTypeId: roomTypeId || null,
        startDate,
        endDate,
        adjustmentType,
        adjustmentValue: 100,
        priority,
        isActive,
      };
      adminService
        .checkRateRuleOverlap(payload)
        .then((res) => {
          if (res.data?.hasOverlap) {
            setOverlapData(res.data);
          } else {
            setOverlapData(null);
          }
        })
        .catch(() => {});
    }
  }, [
    startDate,
    endDate,
    roomTypeId,
    priority,
    isActive,
    name,
    adjustmentType,
  ]);

  function toggleDay(day: number) {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(ERROR_MESSAGES.RULE_NAME_REQUIRED);
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage(ERROR_MESSAGES.START_END_DATES_REQUIRED);
      return;
    }
    if (endDate < startDate) {
      setErrorMessage(ERROR_MESSAGES.END_DATE_ON_OR_AFTER_START);
      return;
    }

    let calculatedAdjustmentValue = 0;
    if (adjustmentType === 'percent_markup') {
      const pct = parseFloat(inputValue);
      if (isNaN(pct)) {
        setErrorMessage(ERROR_MESSAGES.INVALID_PERCENTAGE);
        return;
      }
      calculatedAdjustmentValue = percentageToBps(pct);
    } else {
      calculatedAdjustmentValue = nairaToMinor(inputValue);
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: AdminRateRuleInput = {
      name: name.trim(),
      roomTypeId: roomTypeId.trim() ? roomTypeId : null,
      startDate,
      endDate,
      daysOfWeek: selectedDays.length > 0 ? selectedDays : null,
      adjustmentType,
      adjustmentValue: calculatedAdjustmentValue,
      minNights: minNights ? parseInt(minNights, 10) : null,
      maxNights: maxNights ? parseInt(maxNights, 10) : null,
      priority,
      isActive,
    };

    try {
      if (isEditing && rule?.id) {
        await adminService.updateRateRule(rule.id, payload);
      } else {
        await adminService.createRateRule(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_RATE_RULE,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onClose();
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

        <form onSubmit={handleSubmit} className="text-small space-y-4 p-6">
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

          {/* Rule Name */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">
              Rule Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rule-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. December Peak Holiday Uplift, Long Stay Discount"
            />
          </div>

          {/* Room Type Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-room-type">Applicable Room Type</Label>
            <Select
              items={[
                { value: 'all', label: 'All Room Types (Property-Wide)' },
                ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
              ]}
              value={roomTypeId || 'all'}
              onValueChange={(val) =>
                setRoomTypeId(val === 'all' || !val ? '' : val)
              }
            >
              <SelectTrigger id="rule-room-type" className="w-full">
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
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-start-date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-end-date">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-1.5">
            <Label>Days of Week (Leave all unchecked for everyday)</Label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {DAYS.map((d) => {
                const isSelected = selectedDays.includes(d.day);
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

          {/* Adjustment Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-adjustment-type">Adjustment Type</Label>
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
                value={adjustmentType}
                onValueChange={(val) => {
                  if (val) setAdjustmentType(val as RateAdjustmentType);
                }}
              >
                <SelectTrigger id="rule-adjustment-type" className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-adjustment-value">
                {adjustmentType === 'percent_markup'
                  ? 'Percentage (% e.g. 20 or -15)'
                  : 'Value in Naira (₦)'}
              </Label>
              <Input
                id="rule-adjustment-value"
                type="text"
                required
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  adjustmentType === 'percent_markup' ? '20' : '90,000'
                }
              />
            </div>
          </div>

          {/* Min / Max Nights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-min-nights">
                Min Stay Nights (Optional)
              </Label>
              <Input
                id="rule-min-nights"
                type="number"
                min="1"
                value={minNights}
                onChange={(e) => setMinNights(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-max-nights">
                Max Stay Nights (Optional)
              </Label>
              <Input
                id="rule-max-nights"
                type="number"
                min="1"
                value={maxNights}
                onChange={(e) => setMaxNights(e.target.value)}
                placeholder="e.g. 14"
              />
            </div>
          </div>

          {/* Priority & Active */}
          <div className="grid grid-cols-2 items-center gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="rule-priority">
                Priority Integer (Higher wins)
              </Label>
              <Input
                id="rule-priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="flex items-center gap-2.5 pt-5">
              <Checkbox
                id="ruleActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
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
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSaving}>
              {isEditing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
