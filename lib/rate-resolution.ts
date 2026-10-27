import { fromISO } from '@/lib/dates';
import type {
  NightRateResolution,
  RateRuleInput,
} from '@/types/inventory.types';

/**
 * Converts a Naira string or number (e.g. "85,000" or "85000.50" or 85000) into integer minor units (kobo).
 */
export function nairaToMinor(value: string | number): number {
  if (typeof value === 'number') {
    if (isNaN(value) || value < 0) return 0;
    return Math.round(value * 100);
  }
  const cleaned = value.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

/**
 * Formats minor units (kobo) into standard formatted Naira string.
 */
export function minorToNaira(
  minor: number | null | undefined,
  includeDecimals = false,
): string {
  if (minor === null || minor === undefined || isNaN(minor)) return '0';
  const naira = minor / 100;
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(naira);
}

/**
 * Converts percentage (e.g. 20 for 20%) into basis points (2000).
 */
export function percentageToBps(percent: number): number {
  if (isNaN(percent)) return 0;
  return Math.round(percent * 100);
}

/**
 * Converts basis points (e.g. 2000) into percentage (20).
 */
export function bpsToPercentage(bps: number): number {
  if (isNaN(bps)) return 0;
  return bps / 100;
}

/**
 * Checks if a given ISO date is a weekend night (Friday = 5, Saturday = 6).
 * Employs native JS getDay mappings (0=Sunday ... 6=Saturday)
 */
export function isWeekendNight(dateStr: string): boolean {
  const day = fromISO(dateStr).getDay();
  return day === 5 || day === 6;
}

/**
 * Resolves nightly rate against room base/weekend price and active rate rules.
 */
export function resolveNightlyRate(params: {
  roomTypeId: string;
  date: string; // YYYY-MM-DD
  basePriceMinor: number;
  weekendPriceMinor: number | null;
  stayNights?: number;
  activeRules: RateRuleInput[];
}): NightRateResolution {
  const {
    roomTypeId,
    date,
    basePriceMinor,
    weekendPriceMinor,
    stayNights = 1,
    activeRules,
  } = params;

  const weekend = isWeekendNight(date);
  const startingRate =
    weekend && weekendPriceMinor !== null ? weekendPriceMinor : basePriceMinor;

  // Native Javascript getDay: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const dayOfWeek = fromISO(date).getDay();

  // Filter eligible active rules
  const eligibleRules = activeRules.filter((rule) => {
    if (!rule.isActive) return false;

    // Room type match: either specific room type or null (property-wide)
    if (rule.roomTypeId !== null && rule.roomTypeId !== roomTypeId) {
      return false;
    }

    // Date range match (inclusive lexical match string comparison)
    if (date < rule.startDate || date > rule.endDate) {
      return false;
    }

    // Days of week match (expects JS structure matching 0=Sun, 6=Sat)
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      if (!rule.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    // Minimum stay nights
    if (rule.minNights !== null && stayNights < rule.minNights) {
      return false;
    }

    // Maximum stay nights
    if (rule.maxNights !== null && stayNights > rule.maxNights) {
      return false;
    }

    return true;
  });

  if (eligibleRules.length === 0) {
    return {
      date,
      resolvedRateMinor: startingRate,
      baseRateMinor: startingRate,
      isWeekend: weekend,
      winningRule: null,
    };
  }

  // Sort candidate rules by priority descending
  // Tie-breaker 1: Room-specific rule beats property-wide rule
  // Tie-breaker 2: Highest absolute adjustment value
  eligibleRules.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const aSpecific = a.roomTypeId !== null ? 1 : 0;
    const bSpecific = b.roomTypeId !== null ? 1 : 0;
    if (bSpecific !== aSpecific) {
      return bSpecific - aSpecific;
    }
    return b.adjustmentValue - a.adjustmentValue;
  });

  const winningRule = eligibleRules[0];
  let calculatedRate = startingRate;

  switch (winningRule.adjustmentType) {
    case 'fixed_price':
      calculatedRate = winningRule.adjustmentValue;
      break;
    case 'percent_markup':
      // adjustmentValue is in basis points e.g. 2000 = +20.00%, -1500 = -15.00%
      calculatedRate = Math.round(
        startingRate * (1 + winningRule.adjustmentValue / 10000),
      );
      break;
    case 'amount_markup':
      // adjustmentValue is in minor units (kobo)
      calculatedRate = Math.max(0, startingRate + winningRule.adjustmentValue);
      break;
  }

  return {
    date,
    resolvedRateMinor: calculatedRate,
    baseRateMinor: startingRate,
    isWeekend: weekend,
    winningRule: {
      id: winningRule.id,
      name: winningRule.name,
      adjustmentType: winningRule.adjustmentType,
      adjustmentValue: winningRule.adjustmentValue,
      priority: winningRule.priority,
    },
  };
}
