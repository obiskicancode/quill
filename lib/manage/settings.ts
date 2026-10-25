/** Hotel rules for managing a booking, read from hotel settings. */
export interface ManageSettings {
  /** Dates can be changed online until this many hours before check-in. */
  minNoticeHours: number;
  /** How many times a guest may change dates online. */
  maxChanges: number;
  refundTimeline: string;
  manualRefundTimeline: string;
  quoteTtlMinutes: number;
  holdSeconds: number;
}

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
