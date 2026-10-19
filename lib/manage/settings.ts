/** MOCK hotel rules for managing a booking. In production these come from hotel settings. Values are samples. */
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

export function getManageSettings(demos: Set<string>): ManageSettings {
  return {
    minNoticeHours: 48,
    maxChanges: 2,
    refundTimeline: '5 to 10 business days',
    manualRefundTimeline: '7 to 14 business days',
    quoteTtlMinutes: 10,
    holdSeconds: demos.has('shorthold') ? 150 : 15 * 60,
  };
}
