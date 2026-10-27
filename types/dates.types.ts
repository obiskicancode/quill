/** All dates are local calendar dates as "YYYY-MM-DD". Never use toISOString() for these (it shifts to UTC). */
export type ISODate = string;

export interface Clock {
  today: ISODate;
  /** Minutes since midnight in the hotel's time zone. */
  minutes: number;
}

export interface DateRange {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
}
