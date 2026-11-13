/**
 * Resolves the manage-booking settings, falling back to safe defaults when the
 * hotel row has not configured them yet.
 */
import type { ManageSettings } from '@/types/manage.types';

/** Loads notice periods, change limits, refund timelines and quote TTLs. */
export async function getManageSettings(): Promise<ManageSettings> {
  const { getHotelRow } = await import('../db/queries/content-data');
  const row = await getHotelRow();
  const stored = (row?.manageSettings ?? {}) as Partial<ManageSettings>;
  return {
    minNoticeHours: stored.minNoticeHours ?? 48,
    maxChanges: stored.maxChanges ?? 2,
    refundTimeline: stored.refundTimeline ?? '5 to 10 business days',
    manualRefundTimeline:
      stored.manualRefundTimeline ?? '7 to 14 business days',
    quoteTtlMinutes: stored.quoteTtlMinutes ?? 10,
    holdSeconds: stored.holdSeconds ?? (row?.holdMinutes ?? 15) * 60,
  };
}
