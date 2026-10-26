'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import type { AdminRole } from '@/lib/auth/permissions';
import { addDays, nightsBetween } from '@/lib/dates';
import { formatNaira } from '@/lib/format';
import type { CheckoutQuoteResponse } from '@/types/checkout.types';
import type { AdminCreateReservationInput } from '@/types/reservation.types';

interface RoomTypeOption {
  id: string;
  name: string;
  slug: string;
  maxAdults: number;
  maxChildren: number;
  extraBedAvailable: boolean;
  basePriceMinor: number;
}

interface ExtraCatalogItem {
  id: string;
  name: string;
  priceMinor: number;
  unit: string;
  maxQuantity: number;
}

interface NewReservationClientProps {
  roomTypes: RoomTypeOption[];
  extrasCatalog: ExtraCatalogItem[];
  role: AdminRole;
  today: string;
}

export function NewReservationClient({
  roomTypes,
  extrasCatalog,
  role,
  today,
}: NewReservationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isManagerOrOwner = role === 'owner' || role === 'manager';

  const prefillCheckIn = searchParams.get('checkIn');
  const prefillCheckOut = searchParams.get('checkOut');
  const prefillRoomTypeId = searchParams.get('roomTypeId');
  const prefillRoomId = searchParams.get('roomId');

  // 1. Stay State
  const [checkIn, setCheckIn] = useState(() =>
    prefillCheckIn && /^\d{4}-\d{2}-\d{2}$/.test(prefillCheckIn)
      ? prefillCheckIn
      : today,
  );
  const [checkOut, setCheckOut] = useState(() =>
    prefillCheckOut && /^\d{4}-\d{2}-\d{2}$/.test(prefillCheckOut)
      ? prefillCheckOut
      : addDays(today, 1),
  );
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(
    () => prefillRoomTypeId || roomTypes[0]?.id || '',
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => prefillRoomId || '',
  ); // empty = auto-assign
  const [extraBed, setExtraBed] = useState(false);

  // Available candidate rooms
  const [availableRooms, setAvailableRooms] = useState<
    { id: string; roomNumber: string; floor: number | null }[]
  >([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // 2. Extras State
  const [extraSelections, setExtraSelections] = useState<
    Record<string, number>
  >({});

  // 3. Discount State (Manager/Owner only)
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(
    'percentage',
  );
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [discountReason, setDiscountReason] = useState('');

  // 4. Live Quote
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);

  // 5. Guest Details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [noEmail, setNoEmail] = useState(false);
  const [guestCountry, setGuestCountry] = useState('NG');
  const [arrivalTime, setArrivalTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // 6. Source
  const [source, setSource] = useState<'phone' | 'walk_in' | 'admin'>('phone');

  // 7. Payment Choice
  const [paymentMode, setPaymentMode] = useState<
    'hold' | 'record_payment' | 'pay_at_hotel'
  >('hold');
  const [holdHours, setHoldHours] = useState(24);
  const [paidAmountNaira, setPaidAmountNaira] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'bank_transfer' | 'card'
  >('cash');
  const [paymentReference, setPaymentReference] = useState(
    () => `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  );
  const [paymentNote, setPaymentNote] = useState('');

  // 8. Review & Submission
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRoomType = roomTypes.find((t) => t.id === selectedRoomTypeId);

  // Fetch rooms when roomType or dates change
  useEffect(() => {
    if (selectedRoomTypeId && checkIn && checkOut && checkOut > checkIn) {
      adminService
        .getAvailableRooms({
          roomTypeId: selectedRoomTypeId,
          checkIn,
          checkOut,
        })
        .then((res) => {
          setAvailableRooms(res.data.rooms);
          setSelectedRoomId(''); // reset to auto-assign
        })
        .catch(() => {})
        .finally(() => setLoadingRooms(false));
    }
  }, [selectedRoomTypeId, checkIn, checkOut]);

  // Debounced Live Quote calculation
  useEffect(() => {
    if (!selectedRoomTypeId || !checkIn || !checkOut || checkOut <= checkIn) {
      return;
    }

    const timer = setTimeout(() => {
      setQuoting(true);

      const extrasArray = Object.entries(extraSelections)
        .filter(([, qty]) => qty > 0)
        .map(([id, quantity]) => ({ id, quantity }));

      const numVal = parseFloat(discountValue);
      const discountPayload =
        isManagerOrOwner && hasDiscount && !isNaN(numVal) && numVal > 0
          ? { type: discountType, value: numVal }
          : undefined;

      adminService
        .quoteReservation({
          roomTypeId: selectedRoomTypeId,
          checkIn,
          checkOut,
          adults,
          children,
          extraBed,
          extras: extrasArray,
          discount: discountPayload,
        })
        .then((res) => {
          setQuote(res.data);
          if (res.data?.status === 'ok') {
            setPaidAmountNaira(
              (res.data.breakdown.totalMinor / 100).toString(),
            );
          }
        })
        .catch(() => {})
        .finally(() => setQuoting(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [
    selectedRoomTypeId,
    checkIn,
    checkOut,
    adults,
    children,
    extraBed,
    extraSelections,
    hasDiscount,
    discountType,
    discountValue,
    isManagerOrOwner,
  ]);

  const handleExtraQuantityChange = (id: string, delta: number) => {
    setExtraSelections((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must accept the terms on behalf of the guest to proceed.');
      return;
    }

    if (quote?.status !== 'ok') {
      setError('Please select valid stay dates and an available room.');
      return;
    }

    if (!isManagerOrOwner && checkIn < today) {
      setError(
        'Only managers and owners can create reservations with past check-in dates.',
      );
      return;
    }

    if (hasDiscount && (!discountReason || discountReason.trim().length < 3)) {
      setError('A reason is required when applying a staff discount.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const extrasArray = Object.entries(extraSelections)
        .filter(([, qty]) => qty > 0)
        .map(([id, quantity]) => ({ id, quantity }));

      const numVal = parseFloat(discountValue);

      let pChoice: AdminCreateReservationInput['paymentChoice'];
      if (paymentMode === 'hold') {
        pChoice = { mode: 'hold', holdHours };
      } else if (paymentMode === 'record_payment') {
        const pNum = parseFloat(paidAmountNaira);
        if (isNaN(pNum) || pNum <= 0) {
          setError('Please specify a valid payment amount.');
          setSubmitting(false);
          return;
        }
        pChoice = {
          mode: 'record_payment',
          amountMinor: Math.round(pNum * 100),
          method: paymentMethod,
          reference: paymentReference.trim(),
          note: paymentNote.trim() || undefined,
        };
      } else {
        pChoice = { mode: 'pay_at_hotel' };
      }

      const res = await adminService.createReservation({
        checkIn,
        checkOut,
        adults,
        children,
        roomTypeId: selectedRoomTypeId,
        roomId: selectedRoomId || undefined,
        extraBed,
        extras: extrasArray,
        guest: {
          fullName: guestName.trim(),
          email: noEmail ? undefined : guestEmail.trim() || undefined,
          phone: guestPhone.trim(),
          country: guestCountry.trim() || 'NG',
          arrivalTime: arrivalTime.trim() || undefined,
          specialRequests: specialRequests.trim() || undefined,
        },
        noEmail,
        internalNotes: internalNotes.trim() || undefined,
        source,
        discount:
          isManagerOrOwner && hasDiscount && !isNaN(numVal) && numVal > 0
            ? {
                type: discountType,
                value: numVal,
                reason: discountReason.trim(),
              }
            : undefined,
        paymentChoice: pChoice,
        termsAcceptedByStaff: true,
        idempotencyKey: crypto.randomUUID(),
      });

      router.push(`/admin/reservations/${res.data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create reservation',
      );
      setSubmitting(false);
    }
  };

  const nights = nightsBetween(checkIn, checkOut);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/admin/reservations"
          className="rounded-control text-small text-muted hover:bg-paper hover:text-ink inline-flex min-h-10 items-center gap-1.5 px-2.5 font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to reservations</span>
        </Link>
        <h1 className="text-h1 font-display text-ink mt-2 font-bold tracking-tight">
          New Reservation
        </h1>
        <p className="text-small text-muted">
          Create a front desk booking for walk-in guests, phone calls, or direct
          hotel reserves.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-control border-danger/30 bg-danger/10 text-small text-danger flex items-start gap-2.5 border p-4"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form (2 columns) */}
          <div className="space-y-6 lg:col-span-2">
            {/* 1. Stay & Room Picker */}
            <AdminCard
              title="1. Stay and Room Selection"
              description="Dates, guests, room category, and room allocation."
            >
              <div className="space-y-4">
                {/* Dates */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Check-in Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={isManagerOrOwner ? undefined : today}
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Check-out Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={addDays(checkIn, 1)}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Adults (Ages 13+) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={activeRoomType?.maxAdults ?? 10}
                      required
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Children (Ages 0-12)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={activeRoomType?.maxChildren ?? 5}
                      value={children}
                      onChange={(e) =>
                        setChildren(parseInt(e.target.value) || 0)
                      }
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Room Type Selector */}
                <div>
                  <label className="text-small text-ink block font-semibold">
                    Room Category <span className="text-danger">*</span>
                  </label>
                  <div className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {roomTypes.map((rt) => {
                      const selected = selectedRoomTypeId === rt.id;
                      return (
                        <button
                          key={rt.id}
                          type="button"
                          onClick={() => setSelectedRoomTypeId(rt.id)}
                          className={`rounded-control flex items-start justify-between border p-3.5 text-left transition-colors ${
                            selected
                              ? 'border-accent bg-accent/10 ring-accent ring-2'
                              : 'border-line bg-paper hover:border-ink'
                          }`}
                        >
                          <div>
                            <p className="text-small text-ink font-semibold">
                              {rt.name}
                            </p>
                            <p className="text-caption text-muted">
                              Max {rt.maxAdults} adults, {rt.maxChildren}{' '}
                              children
                            </p>
                          </div>
                          <span className="text-small text-ink font-bold">
                            {formatNaira(rt.basePriceMinor / 100)}/nt
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Room Picker */}
                <div>
                  <label className="text-small text-ink block font-semibold">
                    Room Assignment
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    disabled={loadingRooms}
                    className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                  >
                    <option value="">Auto-assign best available room</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber}{' '}
                        {r.floor ? `(Floor ${r.floor})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-caption text-muted mt-1">
                    {loadingRooms
                      ? 'Checking available rooms…'
                      : availableRooms.length > 0
                        ? `${availableRooms.length} room(s) currently vacant for selected dates.`
                        : 'No specific rooms vacant for these dates (category may be sold out).'}
                  </p>
                </div>

                {/* Extra Bed Toggle */}
                {activeRoomType?.extraBedAvailable && (
                  <label className="text-small text-ink flex cursor-pointer items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={extraBed}
                      onChange={(e) => setExtraBed(e.target.checked)}
                      className="border-line text-accent focus:ring-accent size-4 rounded-sm"
                    />
                    <span>Add rollaway extra bed</span>
                  </label>
                )}
              </div>
            </AdminCard>

            {/* 2. Guest Information */}
            <AdminCard
              title="2. Guest Information"
              description="Primary contact and arrival details."
            >
              <div className="space-y-4">
                <div>
                  <label className="text-small text-ink block font-semibold">
                    Guest Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                    className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Phone Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+234 801 234 5678"
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Email Address{' '}
                      {!noEmail && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="email"
                      required={!noEmail}
                      disabled={noEmail}
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="disabled:bg-canvas rounded-control border-line bg-paper text-small text-ink focus:border-ink disabled:text-muted mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                    <label className="text-caption text-ink mt-1.5 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={noEmail}
                        onChange={(e) => setNoEmail(e.target.checked)}
                        className="border-line text-accent focus:ring-accent size-3.5 rounded-sm"
                      />
                      <span>
                        No email available (skips guest email dispatch)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Country
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={guestCountry}
                      onChange={(e) =>
                        setGuestCountry(e.target.value.toUpperCase())
                      }
                      placeholder="NG"
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 uppercase focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Arrival Time
                    </label>
                    <input
                      type="text"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      placeholder="e.g. 14:00"
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-small text-ink block font-semibold">
                      Booking Channel
                    </label>
                    <select
                      value={source}
                      onChange={(e) =>
                        setSource(
                          e.target.value as 'phone' | 'walk_in' | 'admin',
                        )
                      }
                      className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                    >
                      <option value="phone">Phone reservation</option>
                      <option value="walk_in">Walk-in guest</option>
                      <option value="admin">Admin courtesy / reserve</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-small text-ink block font-semibold">
                    Special Requests
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Dietary requirements, high floor, quiet room..."
                    className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-small text-ink block font-semibold">
                    Internal Staff Notes
                  </label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Staff notes for reception and auditing..."
                    className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                  />
                </div>
              </div>
            </AdminCard>

            {/* 3. Add-on Extras */}
            {extrasCatalog.length > 0 && (
              <AdminCard
                title="3. Add-on Extras"
                description="Optional amenities and hotel services."
              >
                <div className="divide-line divide-y">
                  {extrasCatalog.map((extra) => {
                    const quantity = extraSelections[extra.id] || 0;
                    return (
                      <div
                        key={extra.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-small text-ink font-semibold">
                            {extra.name}
                          </p>
                          <p className="text-caption text-muted">
                            {formatNaira(extra.priceMinor / 100)} / {extra.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={quantity === 0}
                            onClick={() =>
                              handleExtraQuantityChange(extra.id, -1)
                            }
                            className="rounded-control border-line bg-paper text-ink grid size-8 place-items-center border disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="text-small text-ink w-6 text-center font-bold">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= extra.maxQuantity}
                            onClick={() =>
                              handleExtraQuantityChange(extra.id, 1)
                            }
                            className="rounded-control border-line bg-paper text-ink grid size-8 place-items-center border disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminCard>
            )}

            {/* 4. Staff Discount (Manager/Owner only) */}
            {isManagerOrOwner && (
              <AdminCard
                title="4. Staff Discount (Manager / Owner)"
                description="Apply special courtesy or partner discount."
              >
                <div className="space-y-4">
                  <label className="text-small text-ink flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hasDiscount}
                      onChange={(e) => setHasDiscount(e.target.checked)}
                      className="border-line text-accent focus:ring-accent size-4 rounded-sm"
                    />
                    <span>Apply custom discount to this booking</span>
                  </label>

                  {hasDiscount && (
                    <div className="grid grid-cols-1 gap-4 pl-6 sm:grid-cols-3">
                      <div>
                        <label className="text-small text-ink block font-semibold">
                          Discount Type
                        </label>
                        <select
                          value={discountType}
                          onChange={(e) =>
                            setDiscountType(
                              e.target.value as 'fixed' | 'percentage',
                            )
                          }
                          className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₦)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-small text-ink block font-semibold">
                          Discount Value
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          required
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-small text-ink block font-semibold">
                          Required Reason <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="e.g. Corporate contract"
                          className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </AdminCard>
            )}

            {/* 5. Payment and Status Mode */}
            <AdminCard
              title="5. Payment & Booking Mode"
              description="Choose initial reservation status and payment handling."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Hold */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('hold')}
                    className={`rounded-control flex flex-col border p-4 text-left transition-colors ${
                      paymentMode === 'hold'
                        ? 'border-accent bg-accent/10 ring-accent ring-2'
                        : 'border-line bg-paper hover:border-ink'
                    }`}
                  >
                    <CalendarDays
                      className="text-accent-ink size-5"
                      aria-hidden="true"
                    />
                    <p className="text-small text-ink mt-2 font-semibold">
                      Hold room with payment link
                    </p>
                    <p className="text-caption text-muted">
                      Status pending. Generates payment link with staff hold
                      duration.
                    </p>
                  </button>

                  {/* Record Payment Now */}
                  {isManagerOrOwner && (
                    <button
                      type="button"
                      onClick={() => setPaymentMode('record_payment')}
                      className={`rounded-control flex flex-col border p-4 text-left transition-colors ${
                        paymentMode === 'record_payment'
                          ? 'border-accent bg-accent/10 ring-accent ring-2'
                          : 'border-line bg-paper hover:border-ink'
                      }`}
                    >
                      <CreditCard
                        className="text-accent-ink size-5"
                        aria-hidden="true"
                      />
                      <p className="text-small text-ink mt-2 font-semibold">
                        Record payment now
                      </p>
                      <p className="text-caption text-muted">
                        Status confirmed. Record immediate cash, transfer, or
                        POS payment.
                      </p>
                    </button>
                  )}

                  {/* Pay at Hotel */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('pay_at_hotel')}
                    className={`rounded-control flex flex-col border p-4 text-left transition-colors ${
                      paymentMode === 'pay_at_hotel'
                        ? 'border-accent bg-accent/10 ring-accent ring-2'
                        : 'border-line bg-paper hover:border-ink'
                    }`}
                  >
                    <DollarSign
                      className="text-accent-ink size-5"
                      aria-hidden="true"
                    />
                    <p className="text-small text-ink mt-2 font-semibold">
                      Confirm without payment
                    </p>
                    <p className="text-caption text-muted">
                      Pay at hotel. Confirmed with balance due shown at arrival.
                    </p>
                  </button>
                </div>

                {/* Hold parameters */}
                {paymentMode === 'hold' && (
                  <div className="bg-canvas rounded-control border-line text-small space-y-2 border p-4">
                    <label className="text-ink block font-semibold">
                      Hold Duration (Hours)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[2, 6, 12, 24, 48, 72].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setHoldHours(hours)}
                          className={`rounded-control text-caption border px-3 py-1.5 font-semibold transition-colors ${
                            holdHours === hours
                              ? 'border-accent bg-accent text-paper'
                              : 'border-line bg-paper text-ink hover:border-ink'
                          }`}
                        >
                          {hours} hours
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Immediate payment inputs */}
                {paymentMode === 'record_payment' && (
                  <div className="bg-canvas rounded-control border-line text-small space-y-3 border p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-ink block font-semibold">
                          Amount (₦) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={paidAmountNaira}
                          onChange={(e) => setPaidAmountNaira(e.target.value)}
                          className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-ink block font-semibold">
                          Method
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value as
                                'cash' | 'bank_transfer' | 'card',
                            )
                          }
                          className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                        >
                          <option value="cash">Cash at Hotel</option>
                          <option value="bank_transfer">
                            Direct Bank Transfer
                          </option>
                          <option value="card">Card POS Terminal</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-ink block font-semibold">
                          Reference
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 font-mono focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-ink block font-semibold">
                        Receipt / Note
                      </label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="e.g. Front desk receipt #0129"
                        className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </AdminCard>
          </div>

          {/* Sticky Financial Summary Sidebar */}
          <div className="space-y-6">
            <div className="rounded-card border-line bg-paper sticky top-6 space-y-5 border p-5 shadow-sm">
              <h2 className="font-display text-h3 text-ink font-semibold">
                Booking Summary
              </h2>

              {/* Basic Details */}
              <div className="border-line text-small space-y-2 border-b pb-4">
                <div className="flex justify-between">
                  <span className="text-muted">Room:</span>
                  <span className="text-ink font-semibold">
                    {activeRoomType?.name ?? 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Dates:</span>
                  <span className="text-ink font-semibold">
                    {checkIn} to {checkOut} ({nights}{' '}
                    {nights === 1 ? 'night' : 'nights'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Guests:</span>
                  <span className="text-ink font-semibold">
                    {adults} Adults
                    {children > 0 ? `, ${children} Children` : ''}
                  </span>
                </div>
              </div>

              {/* Price Breakdown from Server Quote */}
              {quoting ? (
                <div className="text-small text-muted flex items-center justify-center p-6">
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Calculating price...
                </div>
              ) : quote?.status === 'ok' ? (
                <div className="text-small space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">Room Subtotal:</span>
                    <span>
                      {formatNaira(quote.breakdown.roomSubtotalMinor / 100)}
                    </span>
                  </div>

                  {quote.breakdown.extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="text-caption text-muted flex justify-between"
                    >
                      <span>
                        {extra.name} (x{extra.quantity}):
                      </span>
                      <span>{formatNaira(extra.totalMinor / 100)}</span>
                    </div>
                  ))}

                  {quote.breakdown.discount && (
                    <div className="text-success flex justify-between">
                      <span>{quote.breakdown.discount.label}:</span>
                      <span>
                        -
                        {formatNaira(
                          quote.breakdown.discount.amountMinor / 100,
                        )}
                      </span>
                    </div>
                  )}

                  <div className="text-caption text-muted flex justify-between">
                    <span>Service Charge:</span>
                    <span>
                      {formatNaira(quote.breakdown.serviceChargeMinor / 100)}
                    </span>
                  </div>

                  <div className="text-caption text-muted flex justify-between">
                    <span>Tax:</span>
                    <span>{formatNaira(quote.breakdown.taxMinor / 100)}</span>
                  </div>

                  <div className="border-line text-ink flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total Amount:</span>
                    <span>{formatNaira(quote.breakdown.totalMinor / 100)}</span>
                  </div>
                </div>
              ) : quote?.status === 'unavailable' ||
                quote?.status === 'invalid' ? (
                <div className="rounded-control border-danger/40 bg-danger/10 text-caption text-danger border p-3">
                  Room category is unavailable for the selected dates.
                </div>
              ) : null}

              {/* Staff Terms Acknowledgment */}
              <div className="border-line border-t pt-4">
                <label className="text-caption text-ink flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="border-line text-accent focus:ring-accent mt-0.5 size-4 rounded-sm"
                  />
                  <span>
                    I confirm that the guest has agreed to the booking terms and
                    cancellation policy on their behalf.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={
                  submitting || quote?.status !== 'ok' || !termsAccepted
                }
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Creating reservation...
                  </>
                ) : (
                  'Create reservation'
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
