'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Info, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SANITY_PRICE_MINOR } from '@/constants/inventory';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatMinor } from '@/lib/format';
import { minorToNaira, nairaToMinor } from '@/lib/rate-resolution';
import type {
  AdminRoomTypeDetail,
  RoomTypeInput,
} from '@/types/inventory.types';

import { roomTypeDetailsFormSchema, slugify } from './form-schemas';

interface TabDetailsProps {
  initialData?: AdminRoomTypeDetail | null;
  onSave: (data: RoomTypeInput) => Promise<boolean>;
  isSaving: boolean;
  currentRole: 'owner' | 'manager' | 'reception';
}

type RoomTypeFormInput = z.input<typeof roomTypeDetailsFormSchema>;
type RoomTypeFormOutput = z.output<typeof roomTypeDetailsFormSchema>;

/** Room-type details form: copy, occupancy, pricing, policies and SEO fields. */
export function TabDetails({
  initialData,
  onSave,
  isSaving,
  currentRole,
}: TabDetailsProps) {
  const isOwner = currentRole === 'owner';
  const isExisting = !!initialData?.id;

  const [slugLocked, setSlugLocked] = useState(isExisting);
  const [unlockSlugConfirmed, setUnlockSlugConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sanityConfirmPending, setSanityConfirmPending] = useState(false);

  const form = useForm<RoomTypeFormInput, unknown, RoomTypeFormOutput>({
    resolver: zodResolver(roomTypeDetailsFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
      shortDescription: initialData?.shortDescription || '',
      bedConfig: initialData?.bedConfig || '1 King Bed',
      sizeSqm: initialData?.sizeSqm ? String(initialData.sizeSqm) : '38',
      maxAdults: initialData?.maxAdults || 2,
      maxChildren: initialData?.maxChildren || 0,
      extraBedAvailable: initialData?.extraBedAvailable || false,
      extraBedPriceNaira: initialData?.extraBedPriceMinor
        ? minorToNaira(initialData.extraBedPriceMinor)
        : '0',
      basePriceNaira: initialData?.basePriceMinor
        ? minorToNaira(initialData.basePriceMinor)
        : '75,000',
      weekendPriceNaira: initialData?.weekendPriceMinor
        ? minorToNaira(initialData.weekendPriceMinor)
        : '',
      showPrice: initialData?.showPrice ?? true,
      breakfastIncluded: initialData?.breakfastIncluded ?? false,
      viewNotes: initialData?.viewNotes || '',
      isActive: initialData?.isActive ?? true,
      metaTitle: initialData?.metaTitle || '',
      metaDescription: initialData?.metaDescription || '',
    },
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(
    form,
    initialData?.id
      ? `admin-room-type:${initialData.id}`
      : 'admin-room-type:new',
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = form;

  const [
    name,
    slug,
    shortDescription,
    description,
    metaTitle,
    metaDescription,
    basePriceNaira,
    extraBedAvailable,
  ] = useWatch({
    control,
    name: [
      'name',
      'slug',
      'shortDescription',
      'description',
      'metaTitle',
      'metaDescription',
      'basePriceNaira',
      'extraBedAvailable',
    ],
  });

  const busy = isSaving || isSubmitting;

  async function handleFormSubmit(input: RoomTypeFormOutput) {
    setValidationError(null);

    if (input.basePriceMinor > SANITY_PRICE_MINOR && !sanityConfirmPending) {
      setSanityConfirmPending(true);
      return;
    }

    const payload: RoomTypeInput = {
      ...input,
      unlockSlugConfirmed,
    };

    try {
      const saved = await onSave(payload);
      if (saved) {
        form.reset(form.getValues());
        clearDraft();
      }
      setSanityConfirmPending(false);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : ERROR_MESSAGES.FAILED_TO_SAVE,
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-8"
      noValidate
    >
      {validationError && (
        <Alert
          variant="destructive"
          size="panel"
          className="items-center gap-3"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p className="col-start-2">{validationError}</p>
        </Alert>
      )}

      {sanityConfirmPending && (
        <div
          role="region"
          aria-label="High price confirmation"
          className="rounded-card border border-warning/40 bg-warning/10 p-4 text-small"
        >
          <div className="flex items-start gap-3">
            <Info className="size-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-warning">
                Unusually High Price Confirmation
              </p>
              <p className="mt-1 text-muted-foreground">
                You entered a base price of{' '}
                <strong>
                  {formatMinor(nairaToMinor(basePriceNaira ?? 0))}
                </strong>
                . This is higher than the typical sanity threshold (
                {formatMinor(SANITY_PRICE_MINOR)}). Please confirm if this rate
                is intentional.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button type="submit" size="sm">
                  Yes, confirm this price
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSanityConfirmPending(false)}
                >
                  Cancel and edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <section className="rounded-card border border-line bg-card p-6 shadow-raised">
        <h2 className="text-h3 font-semibold text-foreground">
          Room Type Identity
        </h2>
        <p className="mt-1 text-small text-muted-foreground">
          Names, public URL slug, and layout specifications.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field
            id="room-name"
            label="Room Type Name *"
            error={errors.name?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                placeholder="e.g. Deluxe King Suite"
                className={inputClass(errors.name?.message)}
                {...register('name', {
                  onChange: (event) => {
                    if (!isExisting || !slugLocked) {
                      setValue('slug', slugify(event.target.value));
                    }
                  },
                })}
              />
            )}
          </Field>

          <Field id="room-slug" label="URL Slug *" error={errors.slug?.message}>
            {(a11y) => (
              <div className="space-y-1.5">
                {isExisting && slugLocked && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => {
                        if (isOwner) {
                          setSlugLocked(false);
                          setUnlockSlugConfirmed(true);
                        } else {
                          toast.add({
                            title: ERROR_MESSAGES.ONLY_OWNER_UNLOCK_SLUG,
                            type: 'error',
                            priority: 'high',
                          });
                        }
                      }}
                      className="inline-flex h-auto cursor-pointer items-center gap-1 p-0 text-caption text-brand-ink hover:underline"
                    >
                      <Lock className="size-3" /> Locked
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <Input
                    {...a11y}
                    type="text"
                    disabled={isExisting && slugLocked}
                    className={`${inputClass(errors.slug?.message)} disabled:bg-paper disabled:text-muted-foreground`}
                    {...register('slug', {
                      onChange: (event) =>
                        setValue('slug', slugify(event.target.value)),
                    })}
                  />
                  {isExisting && !slugLocked && (
                    <span className="absolute top-2.5 right-3 text-caption text-warning">
                      <Unlock className="size-4" />
                    </span>
                  )}
                </div>
                {isExisting && !slugLocked && (
                  <p className="text-caption text-warning">
                    Warning: Changing the slug breaks existing public bookmarks
                    and links.
                  </p>
                )}
              </div>
            )}
          </Field>

          <div className="sm:col-span-2">
            <Field
              id="room-short-description"
              label="Short Summary"
              error={errors.shortDescription?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="text"
                  maxLength={255}
                  placeholder="Brief summary for search cards and listings"
                  className={inputClass(errors.shortDescription?.message)}
                  {...register('shortDescription')}
                />
              )}
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              id="room-description"
              label="Detailed Description"
              error={errors.description?.message}
            >
              {(a11y) => (
                <Textarea
                  {...a11y}
                  rows={4}
                  placeholder="Detailed description of features, ambiance, and comfort..."
                  className={inputClass(errors.description?.message)}
                  {...register('description')}
                />
              )}
            </Field>
          </div>

          <Field
            id="room-bed-config"
            label="Bed Configuration"
            error={errors.bedConfig?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                placeholder="e.g. 1 King Bed or 2 Twin Beds"
                className={inputClass(errors.bedConfig?.message)}
                {...register('bedConfig')}
              />
            )}
          </Field>

          <Field
            id="room-size-sqm"
            label="Room Size (sqm)"
            error={errors.sizeSqm?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 42"
                className={inputClass(errors.sizeSqm?.message)}
                {...register('sizeSqm')}
              />
            )}
          </Field>

          <Field
            id="room-max-adults"
            label="Max Adults *"
            error={errors.maxAdults?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min="1"
                max="20"
                className={inputClass(errors.maxAdults?.message)}
                {...register('maxAdults', { valueAsNumber: true })}
              />
            )}
          </Field>

          <Field
            id="room-max-children"
            label="Max Children"
            error={errors.maxChildren?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min="0"
                max="10"
                className={inputClass(errors.maxChildren?.message)}
                {...register('maxChildren', { valueAsNumber: true })}
              />
            )}
          </Field>

          {/* Extra Bed */}
          <div className="rounded-card border border-line bg-paper/50 p-4 sm:col-span-2">
            <div className="flex items-center gap-2.5">
              <Controller
                control={control}
                name="extraBedAvailable"
                render={({ field }) => (
                  <Checkbox
                    id="extraBedAvailable"
                    name={field.name}
                    ref={field.ref}
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    onBlur={field.onBlur}
                  />
                )}
              />
              <Label htmlFor="extraBedAvailable" className="cursor-pointer">
                Extra Bed Allowed for this Room Type
              </Label>
            </div>
            {extraBedAvailable && (
              <div className="mt-3 max-w-xs">
                <Field
                  id="room-extra-bed-price"
                  label="Extra Bed Price per Night (₦) — 0 means free"
                  error={errors.extraBedPriceNaira?.message}
                >
                  {(a11y) => (
                    <div className="relative">
                      <span className="absolute top-2 left-3 text-caption text-muted-foreground">
                        ₦
                      </span>
                      <Input
                        {...a11y}
                        type="text"
                        className={`${inputClass(errors.extraBedPriceNaira?.message)} pl-7`}
                        {...register('extraBedPriceNaira')}
                      />
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing & Visibility */}
      <section className="rounded-card border border-line bg-card p-6 shadow-raised">
        <h2 className="text-h3 font-semibold text-foreground">
          Pricing & Publishing
        </h2>
        <p className="mt-1 text-small text-muted-foreground">
          Base rates, weekend adjustments, and guest presentation settings.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field
            id="room-base-price"
            label="Base Nightly Price (₦) *"
            error={errors.basePriceNaira?.message}
            hint="Applies to Sunday through Thursday nights unless overridden by rate rules."
          >
            {(a11y) => (
              <div className="relative">
                <span className="absolute top-2 left-3 text-caption text-muted-foreground">
                  ₦
                </span>
                <Input
                  {...a11y}
                  type="text"
                  placeholder="75,000"
                  className={`${inputClass(errors.basePriceNaira?.message)} pl-7`}
                  {...register('basePriceNaira')}
                />
              </div>
            )}
          </Field>

          <Field
            id="room-weekend-price"
            label="Weekend Price per Night (₦) — Optional"
            error={errors.weekendPriceNaira?.message}
            hint="Applies to Friday and Saturday nights."
          >
            {(a11y) => (
              <div className="relative">
                <span className="absolute top-2 left-3 text-caption text-muted-foreground">
                  ₦
                </span>
                <Input
                  {...a11y}
                  type="text"
                  placeholder="Leave blank to use base price"
                  className={`${inputClass(errors.weekendPriceNaira?.message)} pl-7`}
                  {...register('weekendPriceNaira')}
                />
              </div>
            )}
          </Field>

          <div className="rounded-sm border border-line/60 bg-paper/30 p-3 text-caption text-muted-foreground sm:col-span-2">
            <span className="font-semibold text-foreground">
              Snapshot Guarantee:
            </span>{' '}
            Modifying prices does not change existing bookings. Each reservation
            retains its original confirmed rate snapshot.
          </div>

          <div className="flex items-center gap-2.5">
            <Controller
              control={control}
              name="showPrice"
              render={({ field }) => (
                <Checkbox
                  id="showPrice"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                />
              )}
            />
            <Label htmlFor="showPrice" className="cursor-pointer">
              Show price publicly on website
            </Label>
          </div>

          <div className="flex items-center gap-2.5">
            <Controller
              control={control}
              name="breakfastIncluded"
              render={({ field }) => (
                <Checkbox
                  id="breakfastIncluded"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                />
              )}
            />
            <Label htmlFor="breakfastIncluded" className="cursor-pointer">
              Complimentary Breakfast Included
            </Label>
          </div>

          <div className="flex items-center gap-2.5">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Checkbox
                  id="isActive"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                />
              )}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active / Published (visible for bookings)
            </Label>
          </div>

          <div className="sm:col-span-2">
            <Field
              id="room-view-notes"
              label="View & Floor Notes (Internal / Guest info)"
              error={errors.viewNotes?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="text"
                  placeholder="e.g. Ocean view, floors 2 to 4, quiet garden wing"
                  className={inputClass(errors.viewNotes?.message)}
                  {...register('viewNotes')}
                />
              )}
            </Field>
          </div>
        </div>
      </section>

      {/* SEO & Search Preview */}
      <section className="rounded-card border border-line bg-card p-6 shadow-raised">
        <h2 className="text-h3 font-semibold text-foreground">
          SEO & Search Snippet
        </h2>
        <p className="mt-1 text-small text-muted-foreground">
          Customize how this room type appears in Google and Bing search
          results.
        </p>

        <div className="mt-6 space-y-4">
          <Field
            id="metaTitle"
            label="SEO Title"
            error={errors.metaTitle?.message}
          >
            {(a11y) => (
              <div className="space-y-1.5">
                <div className="flex justify-end">
                  <span
                    className={`text-caption ${(metaTitle ?? '').length > 60 ? 'text-warning' : 'text-muted-foreground'}`}
                  >
                    {(metaTitle ?? '').length} / 160 chars
                  </span>
                </div>
                <Input
                  {...a11y}
                  type="text"
                  maxLength={160}
                  placeholder={
                    name
                      ? `${name} | Quill Apartments`
                      : 'Page title for search engines'
                  }
                  className={inputClass(errors.metaTitle?.message)}
                  {...register('metaTitle')}
                />
              </div>
            )}
          </Field>

          <Field
            id="metaDescription"
            label="Meta Description"
            error={errors.metaDescription?.message}
          >
            {(a11y) => (
              <div className="space-y-1.5">
                <div className="flex justify-end">
                  <span
                    className={`text-caption ${(metaDescription ?? '').length > 160 ? 'text-warning' : 'text-muted-foreground'}`}
                  >
                    {(metaDescription ?? '').length} / 320 chars
                  </span>
                </div>
                <Textarea
                  {...a11y}
                  rows={2}
                  maxLength={320}
                  placeholder="A brief, inviting description that appears beneath the search title"
                  className={inputClass(errors.metaDescription?.message)}
                  {...register('metaDescription')}
                />
              </div>
            )}
          </Field>

          {/* Live Google Search Preview */}
          <div className="mt-4 rounded-card border border-line bg-paper p-4">
            <span className="text-caption font-semibold tracking-wider text-muted-foreground uppercase">
              Live Google Search Preview
            </span>
            <div className="mt-2 space-y-1">
              <p className="text-caption text-muted-foreground">
                https://hotel.example.com/rooms/{slug || 'room-slug'}
              </p>
              <p className="truncate text-body font-medium text-brand-ink hover:underline">
                {metaTitle || name || 'Room Type Name'} | Quill Apartments
              </p>
              <p className="line-clamp-2 text-caption text-muted-foreground">
                {metaDescription ||
                  shortDescription ||
                  description ||
                  'Experience luxury and tranquility with boutique accommodations in Victoria Island.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button type="submit" size="sm" loading={busy} className="min-w-32">
          {busy
            ? 'Saving...'
            : isExisting
              ? 'Save Changes'
              : 'Create Room Type'}
        </Button>
      </div>
    </form>
  );
}
