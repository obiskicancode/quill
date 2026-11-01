'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { inputClass } from '@/components/ui/form-field';
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
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useAvailableRooms,
  useCreateReservation,
  useReservationQuote,
  type AvailableRoomsInput,
  type ReservationQuoteInput,
} from '@/hooks/services/admin/use-reservations-data';
import { useFormDraft } from '@/hooks/use-form-draft';
import { addDays, nightsBetween } from '@/lib/dates';
import { formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  createReservationSchema,
  type CreateReservationInput,
} from '@/schemas/reservation.schema';
import type { AdminRole } from '@/types/auth.types';
import type {
  AdminRoomTypeOption,
  ExtraCatalogItem,
} from '@/types/inventory.types';

interface NewReservationClientProps {
  roomTypes: AdminRoomTypeOption[];
  extrasCatalog: ExtraCatalogItem[];
  role: AdminRole;
  today: string;
}

const newReservationFormSchema = createReservationSchema
  .omit({
    idempotencyKey: true,
    paymentChoice: true,
    termsAcceptedByStaff: true,
  })
  .extend({
    discount: z
      .object({
        type: z.enum(['fixed', 'percentage']),
        value: z.number().positive(ERROR_MESSAGES.AMOUNT_POSITIVE),
        reason: z
          .string()
          .min(3, ERROR_MESSAGES.STAFF_DISCOUNT_REASON_REQUIRED),
      })
      .optional(),
    paymentMode: z
      .enum(['hold', 'record_payment', 'pay_at_hotel'])
      .default('hold'),
    holdHours: z.number().int().min(1).max(72).default(24),
    paidAmountNaira: z.string().default(''),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'card']).default('cash'),
    paymentReference: z.string().default(''),
    paymentNote: z.string().default(''),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: ERROR_MESSAGES.ACCEPT_TERMS_FOR_GUEST,
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.noEmail && !data.guest.email?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['guest', 'email'],
        message: ERROR_MESSAGES.EMAIL_REQUIRED,
      });
    }

    if (data.paymentMode === 'record_payment') {
      const amount = Number.parseFloat(data.paidAmountNaira);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paidAmountNaira'],
          message: ERROR_MESSAGES.VALID_PAYMENT_AMOUNT,
        });
      }
    }
  });

type NewReservationFormInput = z.input<typeof newReservationFormSchema>;
type NewReservationFormOutput = z.output<typeof newReservationFormSchema>;

const NEW_RESERVATION_DRAFT_EXCLUDE = [
  'termsAccepted',
] as const satisfies readonly (keyof NewReservationFormInput)[];

export function NewReservationClient({
  roomTypes,
  extrasCatalog,
  role,
  today,
}: NewReservationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isManagerOrOwner = role === 'owner' || role === 'manager';
  const createReservation = useCreateReservation();

  const prefillCheckIn = searchParams.get('checkIn');
  const prefillCheckOut = searchParams.get('checkOut');
  const roomTypeParam = searchParams.get('roomTypeId');
  const prefillRoomTypeId = roomTypes.some((rt) => rt.id === roomTypeParam)
    ? roomTypeParam
    : undefined;
  const prefillRoomId = prefillRoomTypeId ? searchParams.get('roomId') : null;

  const enquiryId = searchParams.get('enquiryId');
  const prefillName = searchParams.get('name') || '';
  const prefillEmail = searchParams.get('email') || '';
  const prefillPhone = searchParams.get('phone') || '';
  const prefillAdults = searchParams.get('adults')
    ? Number(searchParams.get('adults'))
    : 1;
  const prefillChildren = searchParams.get('children')
    ? Number(searchParams.get('children'))
    : 0;
  const prefillSpecialRequests =
    searchParams.get('message') || searchParams.get('notes') || '';
  const [paymentReference] = useState(
    () => `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  );

  const form = useForm<
    NewReservationFormInput,
    unknown,
    NewReservationFormOutput
  >({
    resolver: zodResolver(newReservationFormSchema),
    defaultValues: {
      checkIn:
        prefillCheckIn && /^\d{4}-\d{2}-\d{2}$/.test(prefillCheckIn)
          ? prefillCheckIn
          : today,
      checkOut:
        prefillCheckOut && /^\d{4}-\d{2}-\d{2}$/.test(prefillCheckOut)
          ? prefillCheckOut
          : addDays(today, 1),
      adults: prefillAdults > 0 ? prefillAdults : 1,
      children: prefillChildren >= 0 ? prefillChildren : 0,
      roomTypeId: prefillRoomTypeId || roomTypes[0]?.id || '',
      roomId: prefillRoomId || undefined,
      extraBed: false,
      extras: [],
      guest: {
        fullName: prefillName,
        email: prefillEmail,
        phone: prefillPhone,
        country: 'NG',
        arrivalTime: '',
        specialRequests: prefillSpecialRequests,
      },
      noEmail: false,
      internalNotes: '',
      source: 'phone',
      discount: undefined,
      paymentMode: 'hold',
      holdHours: 24,
      paidAmountNaira: '',
      paymentMethod: 'cash',
      paymentReference,
      paymentNote: '',
      termsAccepted: false,
    },
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(form, 'admin-reservation-new', {
    exclude: NEW_RESERVATION_DRAFT_EXCLUDE,
  });
  const {
    control,
    formState: { errors, isSubmitted, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setValue,
  } = form;

  const values = useWatch({ control }) as NewReservationFormOutput;
  const checkIn = values.checkIn;
  const checkOut = values.checkOut;
  const adults = values.adults ?? 0;
  const children = values.children ?? 0;
  const selectedRoomTypeId = values.roomTypeId;
  const extraBed = values.extraBed ?? false;
  const noEmail = values.noEmail ?? false;
  const paymentMode = values.paymentMode ?? 'hold';
  const holdHours = values.holdHours ?? 24;
  const termsAccepted = values.termsAccepted ?? false;
  const hasDiscount = values.discount !== undefined;
  const discountType = values.discount?.type ?? 'percentage';
  const extras = values.extras ?? [];

  const activeRoomType = roomTypes.find((t) => t.id === selectedRoomTypeId);

  const roomsInput = useMemo<AvailableRoomsInput | null>(() => {
    if (!selectedRoomTypeId || !checkIn || !checkOut || checkOut <= checkIn) {
      return null;
    }
    return { roomTypeId: selectedRoomTypeId, checkIn, checkOut };
  }, [selectedRoomTypeId, checkIn, checkOut]);

  const availableRoomsQuery = useAvailableRooms(roomsInput);
  const availableRooms = useMemo(
    () => availableRoomsQuery.data ?? [],
    [availableRoomsQuery.data],
  );
  const loadingRooms = availableRoomsQuery.isFetching;

  useEffect(() => {
    if (availableRoomsQuery.data) {
      setValue('roomId', undefined);
    }
  }, [availableRoomsQuery.data, setValue]);

  const quoteCandidate = useMemo<ReservationQuoteInput | null>(() => {
    if (!selectedRoomTypeId || !checkIn || !checkOut || checkOut <= checkIn) {
      return null;
    }

    const discountPayload =
      isManagerOrOwner &&
      values.discount &&
      Number.isFinite(values.discount.value) &&
      values.discount.value > 0
        ? { type: values.discount.type, value: values.discount.value }
        : undefined;

    return {
      roomTypeId: selectedRoomTypeId,
      checkIn,
      checkOut,
      adults,
      children,
      extraBed,
      extras: (values.extras ?? []).filter((extra) => extra.quantity > 0),
      discount: discountPayload,
    };
  }, [
    selectedRoomTypeId,
    checkIn,
    checkOut,
    adults,
    children,
    extraBed,
    values.extras,
    values.discount,
    isManagerOrOwner,
  ]);

  const [quoteInput, setQuoteInput] = useState<ReservationQuoteInput | null>(
    null,
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (quoteCandidate) setQuoteInput(quoteCandidate);
    }, 300);

    return () => clearTimeout(timer);
  }, [quoteCandidate]);

  const quoteQuery = useReservationQuote(quoteInput);
  const quote = quoteQuery.data ?? null;
  const quoting = quoteQuery.isFetching;

  useEffect(() => {
    if (quote?.status === 'ok') {
      setValue(
        'paidAmountNaira',
        (quote.breakdown.totalMinor / 100).toString(),
      );
    }
  }, [quote, setValue]);

  const handleExtraQuantityChange = (id: string, delta: number) => {
    const current = getValues('extras') ?? [];
    const currentQuantity =
      current.find((extra) => extra.id === id)?.quantity ?? 0;
    const next = Math.max(0, currentQuantity + delta);
    const updated =
      next === 0
        ? current.filter((extra) => extra.id !== id)
        : current.some((extra) => extra.id === id)
          ? current.map((extra) =>
              extra.id === id ? { ...extra, quantity: next } : extra,
            )
          : [...current, { id, quantity: next }];

    setValue('extras', updated, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
  };

  const [error, setError] = useState<string | null>(null);
  const busy = isSubmitting || createReservation.isPending;

  const onSubmit = async (input: NewReservationFormOutput) => {
    setError(null);

    if (quote?.status !== 'ok') {
      setError(ERROR_MESSAGES.SELECT_VALID_STAY_AND_ROOM);
      return;
    }

    if (!isManagerOrOwner && input.checkIn < today) {
      setError(ERROR_MESSAGES.MANAGERS_ONLY_PAST_CHECKIN);
      return;
    }

    try {
      const extrasArray = (input.extras ?? [])
        .filter((extra) => extra.quantity > 0)
        .map((extra) => ({ id: extra.id, quantity: extra.quantity }));

      const numVal = input.discount?.value ?? Number.NaN;

      let paymentChoice: CreateReservationInput['paymentChoice'];
      if (input.paymentMode === 'hold') {
        paymentChoice = { mode: 'hold', holdHours: input.holdHours };
      } else if (input.paymentMode === 'record_payment') {
        const paidAmount = Number.parseFloat(input.paidAmountNaira);
        if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
          setError(ERROR_MESSAGES.VALID_PAYMENT_AMOUNT);
          return;
        }
        paymentChoice = {
          mode: 'record_payment',
          amountMinor: Math.round(paidAmount * 100),
          method: input.paymentMethod,
          reference: input.paymentReference.trim(),
          note: input.paymentNote.trim() || undefined,
        };
      } else {
        paymentChoice = { mode: 'pay_at_hotel' };
      }

      const res = await createReservation.mutateAsync({
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        adults: input.adults,
        children: input.children,
        roomTypeId: input.roomTypeId,
        roomId: input.roomId || undefined,
        extraBed: input.extraBed,
        extras: extrasArray,
        guest: {
          fullName: input.guest.fullName.trim(),
          email: input.noEmail
            ? undefined
            : input.guest.email?.trim() || undefined,
          phone: input.guest.phone.trim(),
          country: input.guest.country?.trim() || 'NG',
          arrivalTime: input.guest.arrivalTime?.trim() || undefined,
          specialRequests: input.guest.specialRequests?.trim() || undefined,
        },
        noEmail: input.noEmail,
        internalNotes: input.internalNotes?.trim() || undefined,
        source: input.source,
        discount:
          isManagerOrOwner &&
          input.discount &&
          Number.isFinite(numVal) &&
          numVal > 0
            ? {
                type: input.discount.type,
                value: numVal,
                reason: input.discount.reason.trim(),
              }
            : undefined,
        paymentChoice,
        termsAcceptedByStaff: true,
        enquiryId: enquiryId || undefined,
        idempotencyKey: crypto.randomUUID(),
      });

      clearDraft();
      toast.add({
        title: SUCCESS_MESSAGES.RESERVATION_CREATED,
        type: 'success',
      });
      router.push(`/admin/reservations/${res.id}`);
    } catch (err) {
      applyServerFieldErrors(form.setError, err);
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_CREATE_RESERVATION_UI,
      );
    }
  };

  const validationMessage =
    errors.termsAccepted?.message ??
    errors.discount?.reason?.message ??
    errors.discount?.value?.message ??
    errors.paidAmountNaira?.message ??
    errors.guest?.fullName?.message ??
    errors.guest?.phone?.message ??
    errors.guest?.email?.message ??
    errors.roomTypeId?.message ??
    errors.checkIn?.message ??
    errors.checkOut?.message;
  const displayError = error ?? (isSubmitted ? validationMessage : undefined);

  const nights = nightsBetween(checkIn, checkOut);

  return (
    <div className="space-y-6">
      {enquiryId && (
        <div className="rounded-card border-brand/30 bg-brand/10 flex flex-wrap items-center justify-between gap-2 border p-4">
          <div className="flex items-center gap-3">
            <span className="bg-brand text-paper rounded-full px-2 py-0.5 text-xs font-bold">
              Enquiry Conversion
            </span>
            <p className="text-sm font-medium">
              Creating a booking from enquiry{' '}
              <span className="font-bold">{prefillName || 'Guest'}</span>
            </p>
          </div>
          <Link
            href={`/admin/enquiries/${enquiryId}`}
            className="text-brand text-xs font-semibold hover:underline"
          >
            View Original Enquiry →
          </Link>
        </div>
      )}

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

      {displayError && (
        <div
          role="alert"
          className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2.5 border p-4"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{displayError}</span>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
                      <Controller
                        control={control}
                        name="checkIn"
                        render={({ field }) => (
                          <Calendar
                            mode="range"
                            selected={{
                              from: field.value
                                ? parseISO(field.value)
                                : undefined,
                              to: checkOut ? parseISO(checkOut) : undefined,
                            }}
                            disabled={
                              isManagerOrOwner
                                ? undefined
                                : (date) =>
                                    date <
                                    new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            onSelect={(range) => {
                              if (range?.from) {
                                field.onChange(
                                  format(range.from, 'yyyy-MM-dd'),
                                );
                              }
                              if (range?.to) {
                                setValue(
                                  'checkOut',
                                  format(range.to, 'yyyy-MM-dd'),
                                  {
                                    shouldDirty: true,
                                    shouldValidate: isSubmitted,
                                  },
                                );
                              }
                            }}
                            numberOfMonths={1}
                          />
                        )}
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
                      {...register('adults', { valueAsNumber: true })}
                      className={inputClass(errors.adults?.message)}
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
                      {...register('children', { valueAsNumber: true })}
                      className={inputClass(errors.children?.message)}
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
                          onClick={() =>
                            setValue('roomTypeId', rt.id, {
                              shouldDirty: true,
                              shouldValidate: isSubmitted,
                            })
                          }
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
                  <Controller
                    control={control}
                    name="roomId"
                    render={({ field }) => (
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
                        value={field.value || 'auto'}
                        onValueChange={(val) => {
                          field.onChange(
                            val === 'auto' || !val ? undefined : val,
                          );
                        }}
                        disabled={loadingRooms}
                      >
                        <SelectTrigger
                          id="room-assignment"
                          className="w-full"
                          onBlur={field.onBlur}
                        >
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
                    )}
                  />
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
                    <Controller
                      control={control}
                      name="extraBed"
                      render={({ field }) => (
                        <Checkbox
                          id="extra-bed-toggle"
                          checked={field.value === true}
                          onCheckedChange={(checked) =>
                            field.onChange(!!checked)
                          }
                          onBlur={field.onBlur}
                        />
                      )}
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
                    {...register('guest.fullName')}
                    placeholder="e.g. Adebayo Ogunlesi"
                    className={inputClass(errors.guest?.fullName?.message)}
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
                      {...register('guest.phone')}
                      placeholder="+234 801 234 5678"
                      className={inputClass(errors.guest?.phone?.message)}
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
                      {...register('guest.email')}
                      placeholder="guest@example.com"
                      className={inputClass(errors.guest?.email?.message)}
                    />
                    <Label
                      htmlFor="no-email-checkbox"
                      className="text-caption text-ink mt-1.5 flex cursor-pointer items-center gap-2"
                    >
                      <Controller
                        control={control}
                        name="noEmail"
                        render={({ field }) => (
                          <Checkbox
                            id="no-email-checkbox"
                            checked={field.value === true}
                            onCheckedChange={(checked) =>
                              field.onChange(!!checked)
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                      <span>No email available</span>
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
                      {...register('guest.country', {
                        setValueAs: (value) =>
                          String(value ?? '').toUpperCase(),
                      })}
                      placeholder="NG"
                      className={`${inputClass(errors.guest?.country?.message)} uppercase`}
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
                      {...register('guest.arrivalTime')}
                      placeholder="e.g. 14:00"
                      className={inputClass(errors.guest?.arrivalTime?.message)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="booking-channel"
                      className="text-small text-ink font-semibold"
                    >
                      Booking Channel
                    </Label>
                    <Controller
                      control={control}
                      name="source"
                      render={({ field }) => (
                        <Select
                          items={[
                            { value: 'phone', label: 'Phone reservation' },
                            { value: 'walk_in', label: 'Walk-in guest' },
                            {
                              value: 'admin',
                              label: 'Admin courtesy / reserve',
                            },
                          ]}
                          value={field.value}
                          onValueChange={(val) => {
                            if (val) {
                              field.onChange(
                                val as 'phone' | 'walk_in' | 'admin',
                              );
                            }
                          }}
                        >
                          <SelectTrigger
                            id="booking-channel"
                            className="w-full"
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phone">
                              Phone reservation
                            </SelectItem>
                            <SelectItem value="walk_in">
                              Walk-in guest
                            </SelectItem>
                            <SelectItem value="admin">
                              Admin courtesy / reserve
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
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
                    {...register('guest.specialRequests')}
                    placeholder="Dietary requirements, high floor, quiet room..."
                    className={inputClass(
                      errors.guest?.specialRequests?.message,
                    )}
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
                    {...register('internalNotes')}
                    placeholder="Staff notes for reception and auditing..."
                    className={inputClass(errors.internalNotes?.message)}
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
                    const quantity =
                      extras.find((selection) => selection.id === extra.id)
                        ?.quantity ?? 0;
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
                    <Controller
                      control={control}
                      name="discount"
                      render={({ field }) => (
                        <Checkbox
                          id="discount-toggle-checkbox"
                          checked={field.value !== undefined}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? {
                                    type: 'percentage',
                                    value: 10,
                                    reason: '',
                                  }
                                : undefined,
                            )
                          }
                          onBlur={field.onBlur}
                        />
                      )}
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
                        <Controller
                          control={control}
                          name="discount.type"
                          render={({ field }) => (
                            <Select
                              items={[
                                {
                                  value: 'percentage',
                                  label: 'Percentage (%)',
                                },
                                { value: 'fixed', label: 'Fixed Amount (₦)' },
                              ]}
                              value={field.value ?? discountType}
                              onValueChange={(val) => {
                                if (val) {
                                  field.onChange(val as 'fixed' | 'percentage');
                                }
                              }}
                            >
                              <SelectTrigger
                                id="discount-type-select"
                                className="w-full"
                                onBlur={field.onBlur}
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
                          )}
                        />
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
                          {...register('discount.value', {
                            valueAsNumber: true,
                          })}
                          className={inputClass(
                            errors.discount?.value?.message,
                          )}
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
                          {...register('discount.reason')}
                          placeholder="e.g. Corporate contract"
                          className={inputClass(
                            errors.discount?.reason?.message,
                          )}
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
                    onClick={() =>
                      setValue('paymentMode', 'hold', {
                        shouldDirty: true,
                        shouldValidate: isSubmitted,
                      })
                    }
                    className="h-auto flex-col items-start p-4 text-left font-normal"
                  >
                    <CalendarDays
                      className="text-brand-ink size-5"
                      aria-hidden="true"
                    />
                    <p className="text-small mt-2 font-semibold">
                      Hold room with payment link
                    </p>
                    <p className="text-caption text-wrap opacity-80">
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
                      onClick={() =>
                        setValue('paymentMode', 'record_payment', {
                          shouldDirty: true,
                          shouldValidate: isSubmitted,
                        })
                      }
                      className="h-auto flex-col items-start p-4 text-left font-normal"
                    >
                      <CreditCard
                        className="text-brand-ink size-5"
                        aria-hidden="true"
                      />
                      <p className="text-small mt-2 font-semibold">
                        Record payment now
                      </p>
                      <p className="text-caption text-wrap opacity-80">
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
                    onClick={() =>
                      setValue('paymentMode', 'pay_at_hotel', {
                        shouldDirty: true,
                        shouldValidate: isSubmitted,
                      })
                    }
                    className="h-auto flex-col items-start p-4 text-left font-normal"
                  >
                    <DollarSign
                      className="text-brand-ink size-5"
                      aria-hidden="true"
                    />
                    <p className="text-small mt-2 font-semibold">
                      Confirm without payment
                    </p>
                    <p className="text-caption text-wrap opacity-80">
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
                          onClick={() =>
                            setValue('holdHours', hours, {
                              shouldDirty: true,
                              shouldValidate: isSubmitted,
                            })
                          }
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
                          disabled
                          {...register('paidAmountNaira')}
                          className={inputClass(
                            errors.paidAmountNaira?.message,
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="immediate-payment-method"
                          className="text-ink font-semibold"
                        >
                          Method
                        </Label>
                        <Controller
                          control={control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <Select
                              items={[
                                { value: 'cash', label: 'Cash at Hotel' },
                                {
                                  value: 'bank_transfer',
                                  label: 'Direct Bank Transfer',
                                },
                                {
                                  value: 'card',
                                  label: 'Card POS Terminal',
                                },
                              ]}
                              value={field.value}
                              onValueChange={(val) => {
                                if (val) {
                                  field.onChange(
                                    val as 'cash' | 'bank_transfer' | 'card',
                                  );
                                }
                              }}
                            >
                              <SelectTrigger
                                id="immediate-payment-method"
                                className="w-full"
                                onBlur={field.onBlur}
                              >
                                <SelectValue placeholder="Payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">
                                  Cash at Hotel
                                </SelectItem>
                                <SelectItem value="bank_transfer">
                                  Direct Bank Transfer
                                </SelectItem>
                                <SelectItem value="card">
                                  Card POS Terminal
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="immediate-reference"
                          className="text-ink font-semibold"
                        >
                          Reference
                        </Label>
                        <Input
                          disabled
                          id="immediate-reference"
                          type="text"
                          {...register('paymentReference')}
                          className={`${inputClass(errors.paymentReference?.message)} font-mono`}
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
                        {...register('paymentNote')}
                        placeholder="e.g. Front desk receipt #0129"
                        className={inputClass(errors.paymentNote?.message)}
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
                  <Controller
                    control={control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <Checkbox
                        id="terms-accepted-checkbox"
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                        onBlur={field.onBlur}
                        className="mt-0.5"
                      />
                    )}
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
                disabled={busy || quote?.status !== 'ok' || !termsAccepted}
                className="w-full"
              >
                {busy ? (
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
