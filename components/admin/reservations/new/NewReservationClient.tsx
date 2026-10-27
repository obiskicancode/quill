'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { addDays, nightsBetween } from '@/lib/dates';
import { formatNaira } from '@/lib/format';
import type { AdminRole } from '@/types/auth.types';
import type { CheckoutQuoteResponse } from '@/types/checkout.types';
import type {
  AdminRoomTypeOption,
  ExtraCatalogItem,
} from '@/types/inventory.types';
import type { AdminCreateReservationInput } from '@/types/reservation.types';

interface NewReservationClientProps {
  roomTypes: AdminRoomTypeOption[];
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
          className="rounded-control text-small text-muted-foreground hover:bg-paper hover:text-ink inline-flex min-h-10 items-center gap-1.5 px-2.5 font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to reservations</span>
        </Link>
        <h1 className="text-h1 font-display text-ink mt-2 font-bold tracking-tight">
          New Reservation
        </h1>
        <p className="text-small text-muted-foreground">
          Create a front desk booking for walk-in guests, phone calls, or direct
          hotel reserves.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2.5 border p-4"
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
                <div className="space-y-1.5">
                  <Label className="text-small text-ink font-semibold">
                    Stay Dates <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          size="md"
                          className="w-full justify-start gap-2.5 text-left font-normal"
                        />
                      }
                    >
                      <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                      <span>
                        {checkIn && checkOut
                          ? `${format(parseISO(checkIn), 'LLL dd, y')} - ${format(parseISO(checkOut), 'LLL dd, y')}`
                          : checkIn
                            ? `From ${format(parseISO(checkIn), 'LLL dd, y')}`
                            : 'Select stay dates'}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="range"
                        selected={{
                          from: checkIn ? parseISO(checkIn) : undefined,
                          to: checkOut ? parseISO(checkOut) : undefined,
                        }}
                        disabled={
                          isManagerOrOwner
                            ? undefined
                            : (date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        onSelect={(range) => {
                          if (range?.from)
                            setCheckIn(format(range.from, 'yyyy-MM-dd'));
                          if (range?.to)
                            setCheckOut(format(range.to, 'yyyy-MM-dd'));
                        }}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Guests */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-adults"
                      className="text-small text-ink font-semibold"
                    >
                      Adults (Ages 13+){' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="new-adults"
                      type="number"
                      min="1"
                      max={activeRoomType?.maxAdults ?? 10}
                      required
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-children"
                      className="text-small text-ink font-semibold"
                    >
                      Children (Ages 0-12)
                    </Label>
                    <Input
                      id="new-children"
                      type="number"
                      min="0"
                      max={activeRoomType?.maxChildren ?? 5}
                      value={children}
                      onChange={(e) =>
                        setChildren(parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                {/* Room Type Selector */}
                <div>
                  <Label className="text-small text-ink block font-semibold">
                    Room Category <span className="text-destructive">*</span>
                  </Label>
                  <div className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {roomTypes.map((rt) => {
                      const selected = selectedRoomTypeId === rt.id;
                      return (
                        <Button
                          key={rt.id}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="md"
                          onClick={() => setSelectedRoomTypeId(rt.id)}
                          className="h-auto w-full items-start justify-between p-3.5 text-left font-normal"
                        >
                          <div>
                            <p className="text-small font-semibold">
                              {rt.name}
                            </p>
                            <p className="text-caption opacity-80">
                              Max {rt.maxAdults} adults, {rt.maxChildren}{' '}
                              children
                            </p>
                          </div>
                          <span className="text-small font-bold">
                            {formatNaira(rt.basePriceMinor / 100)}/nt
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Room Picker */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="room-assignment"
                    className="text-small text-ink font-semibold"
                  >
                    Room Assignment
                  </Label>
                  <Select
                    items={[
                      {
                        value: 'auto',
                        label: 'Auto-assign best available room',
                      },
                      ...availableRooms.map((r) => ({
                        value: r.id,
                        label: `Room ${r.roomNumber}${r.floor ? ` (Floor ${r.floor})` : ''}`,
                      })),
                    ]}
                    value={selectedRoomId || 'auto'}
                    onValueChange={(val) =>
                      setSelectedRoomId(val === 'auto' || !val ? '' : val)
                    }
                    disabled={loadingRooms}
                  >
                    <SelectTrigger id="room-assignment" className="w-full">
                      <SelectValue placeholder="Auto-assign best available room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Auto-assign best available room
                      </SelectItem>
                      {availableRooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Room {r.roomNumber}{' '}
                          {r.floor ? `(Floor ${r.floor})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-caption text-muted-foreground mt-1">
                    {loadingRooms
                      ? 'Checking available rooms…'
                      : availableRooms.length > 0
                        ? `${availableRooms.length} room(s) currently vacant for selected dates.`
                        : 'No specific rooms vacant for these dates (category may be sold out).'}
                  </p>
                </div>

                {/* Extra Bed Toggle */}
                {activeRoomType?.extraBedAvailable && (
                  <Label
                    htmlFor="extra-bed-toggle"
                    className="text-small text-ink flex cursor-pointer items-center gap-2 pt-2"
                  >
                    <Checkbox
                      id="extra-bed-toggle"
                      checked={extraBed}
                      onCheckedChange={(checked) => setExtraBed(!!checked)}
                    />
                    <span>Add rollaway extra bed</span>
                  </Label>
                )}
              </div>
            </AdminCard>

            {/* 2. Guest Information */}
            <AdminCard
              title="2. Guest Information"
              description="Primary contact and arrival details."
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-guest-name"
                    className="text-small text-ink font-semibold"
                  >
                    Guest Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-guest-name"
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-guest-phone"
                      className="text-small text-ink font-semibold"
                    >
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="new-guest-phone"
                      type="tel"
                      required
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+234 801 234 5678"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-guest-email"
                      className="text-small text-ink font-semibold"
                    >
                      Email Address{' '}
                      {!noEmail && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="new-guest-email"
                      type="email"
                      required={!noEmail}
                      disabled={noEmail}
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                    />
                    <Label
                      htmlFor="no-email-checkbox"
                      className="text-caption text-ink mt-1.5 flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        id="no-email-checkbox"
                        checked={noEmail}
                        onCheckedChange={(checked) => setNoEmail(!!checked)}
                      />
                      <span>
                        No email available (skips guest email dispatch)
                      </span>
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-guest-country"
                      className="text-small text-ink font-semibold"
                    >
                      Country
                    </Label>
                    <Input
                      id="new-guest-country"
                      type="text"
                      maxLength={2}
                      value={guestCountry}
                      onChange={(e) =>
                        setGuestCountry(e.target.value.toUpperCase())
                      }
                      placeholder="NG"
                      className="uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-arrival-time"
                      className="text-small text-ink font-semibold"
                    >
                      Arrival Time
                    </Label>
                    <Input
                      id="new-arrival-time"
                      type="text"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      placeholder="e.g. 14:00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="booking-channel"
                      className="text-small text-ink font-semibold"
                    >
                      Booking Channel
                    </Label>
                    <Select
                      items={[
                        { value: 'phone', label: 'Phone reservation' },
                        { value: 'walk_in', label: 'Walk-in guest' },
                        { value: 'admin', label: 'Admin courtesy / reserve' },
                      ]}
                      value={source}
                      onValueChange={(val) => {
                        if (val) {
                          setSource(val as 'phone' | 'walk_in' | 'admin');
                        }
                      }}
                    >
                      <SelectTrigger id="booking-channel" className="w-full">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone reservation</SelectItem>
                        <SelectItem value="walk_in">Walk-in guest</SelectItem>
                        <SelectItem value="admin">
                          Admin courtesy / reserve
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-special-requests"
                    className="text-small text-ink font-semibold"
                  >
                    Special Requests
                  </Label>
                  <Textarea
                    id="new-special-requests"
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Dietary requirements, high floor, quiet room..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-internal-notes"
                    className="text-small text-ink font-semibold"
                  >
                    Internal Staff Notes
                  </Label>
                  <Textarea
                    id="new-internal-notes"
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Staff notes for reception and auditing..."
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
                          <p className="text-caption text-muted-foreground">
                            {formatNaira(extra.priceMinor / 100)} / {extra.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            disabled={quantity === 0}
                            onClick={() =>
                              handleExtraQuantityChange(extra.id, -1)
                            }
                            aria-label={`Decrease ${extra.name}`}
                          >
                            -
                          </Button>
                          <span className="text-small text-ink w-6 text-center font-bold">
                            {quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            disabled={quantity >= extra.maxQuantity}
                            onClick={() =>
                              handleExtraQuantityChange(extra.id, 1)
                            }
                            aria-label={`Increase ${extra.name}`}
                          >
                            +
                          </Button>
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
                  <Label
                    htmlFor="discount-toggle-checkbox"
                    className="text-small text-ink flex cursor-pointer items-center gap-2"
                  >
                    <Checkbox
                      id="discount-toggle-checkbox"
                      checked={hasDiscount}
                      onCheckedChange={(checked) => setHasDiscount(!!checked)}
                    />
                    <span>Apply custom discount to this booking</span>
                  </Label>

                  {hasDiscount && (
                    <div className="grid grid-cols-1 gap-4 pl-6 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="discount-type-select"
                          className="text-small text-ink font-semibold"
                        >
                          Discount Type
                        </Label>
                        <Select
                          items={[
                            { value: 'percentage', label: 'Percentage (%)' },
                            { value: 'fixed', label: 'Fixed Amount (₦)' },
                          ]}
                          value={discountType}
                          onValueChange={(val) => {
                            if (val) {
                              setDiscountType(val as 'fixed' | 'percentage');
                            }
                          }}
                        >
                          <SelectTrigger
                            id="discount-type-select"
                            className="w-full"
                          >
                            <SelectValue placeholder="Discount Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              Percentage (%)
                            </SelectItem>
                            <SelectItem value="fixed">
                              Fixed Amount (₦)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="discount-value-input"
                          className="text-small text-ink font-semibold"
                        >
                          Discount Value
                        </Label>
                        <Input
                          id="discount-value-input"
                          type="number"
                          step="any"
                          min="1"
                          required
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="discount-reason-input"
                          className="text-small text-ink font-semibold"
                        >
                          Required Reason{' '}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="discount-reason-input"
                          type="text"
                          required
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="e.g. Corporate contract"
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
                  <Button
                    type="button"
                    variant={paymentMode === 'hold' ? 'default' : 'outline'}
                    size="md"
                    onClick={() => setPaymentMode('hold')}
                    className="h-auto flex-col items-start p-4 text-left font-normal"
                  >
                    <CalendarDays
                      className="text-brand-ink size-5"
                      aria-hidden="true"
                    />
                    <p className="text-small mt-2 font-semibold">
                      Hold room with payment link
                    </p>
                    <p className="text-caption opacity-80">
                      Status pending. Generates payment link with staff hold
                      duration.
                    </p>
                  </Button>

                  {/* Record Payment Now */}
                  {isManagerOrOwner && (
                    <Button
                      type="button"
                      variant={
                        paymentMode === 'record_payment' ? 'default' : 'outline'
                      }
                      size="md"
                      onClick={() => setPaymentMode('record_payment')}
                      className="h-auto flex-col items-start p-4 text-left font-normal"
                    >
                      <CreditCard
                        className="text-brand-ink size-5"
                        aria-hidden="true"
                      />
                      <p className="text-small mt-2 font-semibold">
                        Record payment now
                      </p>
                      <p className="text-caption opacity-80">
                        Status confirmed. Record immediate cash, transfer, or
                        POS payment.
                      </p>
                    </Button>
                  )}

                  {/* Pay at Hotel */}
                  <Button
                    type="button"
                    variant={
                      paymentMode === 'pay_at_hotel' ? 'default' : 'outline'
                    }
                    size="md"
                    onClick={() => setPaymentMode('pay_at_hotel')}
                    className="h-auto flex-col items-start p-4 text-left font-normal"
                  >
                    <DollarSign
                      className="text-brand-ink size-5"
                      aria-hidden="true"
                    />
                    <p className="text-small mt-2 font-semibold">
                      Confirm without payment
                    </p>
                    <p className="text-caption opacity-80">
                      Pay at hotel. Confirmed with balance due shown at arrival.
                    </p>
                  </Button>
                </div>

                {/* Hold parameters */}
                {paymentMode === 'hold' && (
                  <div className="bg-muted rounded-control border-line text-small space-y-2 border p-4">
                    <Label className="text-ink block font-semibold">
                      Hold Duration (Hours)
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[2, 6, 12, 24, 48, 72].map((hours) => (
                        <Button
                          key={hours}
                          type="button"
                          variant={holdHours === hours ? 'default' : 'outline'}
                          size="xs"
                          onClick={() => setHoldHours(hours)}
                        >
                          {hours} hours
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Immediate payment inputs */}
                {paymentMode === 'record_payment' && (
                  <div className="bg-muted rounded-control border-line text-small space-y-3 border p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="immediate-amount"
                          className="text-ink font-semibold"
                        >
                          Amount (₦) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="immediate-amount"
                          type="number"
                          step="any"
                          required
                          value={paidAmountNaira}
                          onChange={(e) => setPaidAmountNaira(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="immediate-payment-method"
                          className="text-ink font-semibold"
                        >
                          Method
                        </Label>
                        <Select
                          items={[
                            { value: 'cash', label: 'Cash at Hotel' },
                            {
                              value: 'bank_transfer',
                              label: 'Direct Bank Transfer',
                            },
                            { value: 'card', label: 'Card POS Terminal' },
                          ]}
                          value={paymentMethod}
                          onValueChange={(val) => {
                            if (val) {
                              setPaymentMethod(
                                val as 'cash' | 'bank_transfer' | 'card',
                              );
                            }
                          }}
                        >
                          <SelectTrigger
                            id="immediate-payment-method"
                            className="w-full"
                          >
                            <SelectValue placeholder="Payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash at Hotel</SelectItem>
                            <SelectItem value="bank_transfer">
                              Direct Bank Transfer
                            </SelectItem>
                            <SelectItem value="card">
                              Card POS Terminal
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="immediate-reference"
                          className="text-ink font-semibold"
                        >
                          Reference
                        </Label>
                        <Input
                          id="immediate-reference"
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="immediate-note"
                        className="text-ink font-semibold"
                      >
                        Receipt / Note
                      </Label>
                      <Input
                        id="immediate-note"
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="e.g. Front desk receipt #0129"
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
                  <span className="text-muted-foreground">Room:</span>
                  <span className="text-ink font-semibold">
                    {activeRoomType?.name ?? 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates:</span>
                  <span className="text-ink font-semibold">
                    {checkIn} to {checkOut} ({nights}{' '}
                    {nights === 1 ? 'night' : 'nights'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests:</span>
                  <span className="text-ink font-semibold">
                    {adults} Adults
                    {children > 0 ? `, ${children} Children` : ''}
                  </span>
                </div>
              </div>

              {/* Price Breakdown from Server Quote */}
              {quoting ? (
                <div className="text-small text-muted-foreground flex items-center justify-center p-6">
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Calculating price...
                </div>
              ) : quote?.status === 'ok' ? (
                <div className="text-small space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Room Subtotal:
                    </span>
                    <span>
                      {formatNaira(quote.breakdown.roomSubtotalMinor / 100)}
                    </span>
                  </div>

                  {quote.breakdown.extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="text-caption text-muted-foreground flex justify-between"
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

                  <div className="text-caption text-muted-foreground flex justify-between">
                    <span>Service Charge:</span>
                    <span>
                      {formatNaira(quote.breakdown.serviceChargeMinor / 100)}
                    </span>
                  </div>

                  <div className="text-caption text-muted-foreground flex justify-between">
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
                <div className="rounded-control border-destructive/40 bg-destructive/10 text-caption text-destructive border p-3">
                  Room category is unavailable for the selected dates.
                </div>
              ) : null}

              {/* Staff Terms Acknowledgment */}
              <div className="border-line border-t pt-4">
                <Label
                  htmlFor="terms-accepted-checkbox"
                  className="text-caption text-ink flex cursor-pointer items-start gap-2"
                >
                  <Checkbox
                    id="terms-accepted-checkbox"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm that the guest has agreed to the booking terms and
                    cancellation policy on their behalf.
                  </span>
                </Label>
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
