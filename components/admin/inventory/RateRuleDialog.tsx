'use client';

import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
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
      setErrorMessage('Rule name is required');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Start and end dates are required');
      return;
    }
    if (endDate < startDate) {
      setErrorMessage('End date must be on or after start date');
      return;
    }

    let calculatedAdjustmentValue = 0;
    if (adjustmentType === 'percent_markup') {
      const pct = parseFloat(inputValue);
      if (isNaN(pct)) {
        setErrorMessage('Valid percentage value required');
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
        err instanceof Error ? err.message : 'Failed to save rate rule',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="rounded-card border-line bg-surface max-h-[90vh] w-full max-w-xl overflow-y-auto border p-6 shadow-2xl">
        <div className="border-line flex items-center justify-between border-b pb-4">
          <h3 className="text-foreground text-h3 font-semibold">
            {isEditing ? 'Edit Rate Rule' : 'New Rate Rule'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-foreground text-muted text-xs"
          >
            Close ✕
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="border-danger/40 bg-danger/10 text-danger mt-4 flex items-center gap-2 rounded border p-3 text-xs"
          >
            <AlertCircle className="size-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {overlapData && overlapData.conflicts.length > 0 && (
          <div
            role="region"
            aria-label="Overlap warning"
            className="border-warning/40 bg-warning/10 mt-4 rounded border p-3 text-xs"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert className="text-warning size-4 shrink-0" />
              <div>
                <p className="text-warning-contrast font-semibold">
                  Overlap Guidance ({overlapData.conflicts.length} existing
                  rules in date range)
                </p>
                <p className="text-muted mt-1">
                  The rule with the highest priority wins. If priorities are
                  equal, a room-specific rule beats a property-wide rule.
                </p>
                <ul className="mt-2 space-y-1">
                  {overlapData.conflicts.map((c) => (
                    <li key={c.id} className="text-muted flex justify-between">
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
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-small mt-4 space-y-4">
          {/* Rule Name */}
          <div>
            <label className="text-foreground block font-medium">
              Rule Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. December Peak Holiday Uplift, Long Stay Discount"
              className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Room Type Selector */}
          <div>
            <label className="text-foreground block font-medium">
              Applicable Room Type
            </label>
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
            >
              <option value="">All Room Types (Property-Wide)</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-foreground block font-medium">
                Start Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-foreground block font-medium">
                End Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="text-foreground block font-medium">
              Days of Week (Leave all unchecked for everyday)
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const isSelected = selectedDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDay(d.day)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand text-white'
                        : 'bg-background border-line text-muted hover:bg-paper border'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adjustment Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-foreground block font-medium">
                Adjustment Type
              </label>
              <select
                value={adjustmentType}
                onChange={(e) =>
                  setAdjustmentType(e.target.value as RateAdjustmentType)
                }
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              >
                <option value="percent_markup">
                  Percentage Markup / Discount (%)
                </option>
                <option value="fixed_price">Fixed Price Replacement (₦)</option>
                <option value="amount_markup">
                  Fixed Amount Adjustment (₦)
                </option>
              </select>
            </div>

            <div>
              <label className="text-foreground block font-medium">
                {adjustmentType === 'percent_markup'
                  ? 'Percentage (% e.g. 20 or -15)'
                  : 'Value in Naira (₦)'}
              </label>
              <input
                type="text"
                required
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  adjustmentType === 'percent_markup' ? '20' : '90,000'
                }
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Min / Max Nights */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-foreground block font-medium">
                Min Stay Nights (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={minNights}
                onChange={(e) => setMinNights(e.target.value)}
                placeholder="e.g. 3"
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-foreground block font-medium">
                Max Stay Nights (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={maxNights}
                onChange={(e) => setMaxNights(e.target.value)}
                placeholder="e.g. 14"
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Priority & Active */}
          <div className="grid grid-cols-2 items-center gap-4 pt-2">
            <div>
              <label className="text-foreground block font-medium">
                Priority Integer (Higher wins)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="ruleActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="text-brand focus:ring-brand size-4 rounded"
              />
              <label
                htmlFor="ruleActive"
                className="text-foreground font-medium"
              >
                Rule is Active
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="border-line flex items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
