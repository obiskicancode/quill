'use client';

import { AlertCircle, Info, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { minorToNaira, nairaToMinor } from '@/lib/rate-resolution';
import type {
  AdminRoomTypeDetail,
  AdminRoomTypeInput,
} from '@/types/inventory.types';
import { SANITY_PRICE_MINOR } from '@/types/inventory.types';

interface TabDetailsProps {
  initialData?: AdminRoomTypeDetail | null;
  onSave: (data: AdminRoomTypeInput) => Promise<void>;
  isSaving: boolean;
  currentRole: 'owner' | 'manager' | 'reception';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function TabDetails({
  initialData,
  onSave,
  isSaving,
  currentRole,
}: TabDetailsProps) {
  const isOwner = currentRole === 'owner';
  const isExisting = !!initialData?.id;

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [slugLocked, setSlugLocked] = useState(isExisting);
  const [unlockSlugConfirmed, setUnlockSlugConfirmed] = useState(false);

  const [description, setDescription] = useState(
    initialData?.description || '',
  );
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || '',
  );
  const [bedConfig, setBedConfig] = useState(
    initialData?.bedConfig || '1 King Bed',
  );
  const [sizeSqm, setSizeSqm] = useState<string>(
    initialData?.sizeSqm ? String(initialData.sizeSqm) : '38',
  );
  const [maxAdults, setMaxAdults] = useState<number>(
    initialData?.maxAdults || 2,
  );
  const [maxChildren, setMaxChildren] = useState<number>(
    initialData?.maxChildren || 0,
  );

  const [extraBedAvailable, setExtraBedAvailable] = useState<boolean>(
    initialData?.extraBedAvailable || false,
  );
  const [extraBedPriceNaira, setExtraBedPriceNaira] = useState<string>(
    initialData?.extraBedPriceMinor
      ? minorToNaira(initialData.extraBedPriceMinor)
      : '0',
  );

  const [basePriceNaira, setBasePriceNaira] = useState<string>(
    initialData?.basePriceMinor
      ? minorToNaira(initialData.basePriceMinor)
      : '75,000',
  );
  const [weekendPriceNaira, setWeekendPriceNaira] = useState<string>(
    initialData?.weekendPriceMinor
      ? minorToNaira(initialData.weekendPriceMinor)
      : '',
  );

  const [showPrice, setShowPrice] = useState<boolean>(
    initialData?.showPrice ?? true,
  );
  const [breakfastIncluded, setBreakfastIncluded] = useState<boolean>(
    initialData?.breakfastIncluded ?? false,
  );
  const [viewNotes, setViewNotes] = useState(initialData?.viewNotes || '');
  const [isActive, setIsActive] = useState<boolean>(
    initialData?.isActive ?? true,
  );

  // SEO
  const [metaTitle, setMetaTitle] = useState(initialData?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(
    initialData?.metaDescription || '',
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [sanityConfirmPending, setSanityConfirmPending] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!isExisting || !slugLocked) {
      setSlug(slugify(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const baseMinor = nairaToMinor(basePriceNaira);
    if (baseMinor <= 0) {
      setValidationError('Base price must be greater than ₦0.');
      return;
    }

    if (baseMinor > SANITY_PRICE_MINOR && !sanityConfirmPending) {
      setSanityConfirmPending(true);
      return;
    }

    const weekendMinor = weekendPriceNaira.trim()
      ? nairaToMinor(weekendPriceNaira)
      : null;
    const extraBedMinor = extraBedAvailable
      ? nairaToMinor(extraBedPriceNaira)
      : null;

    const payload: AdminRoomTypeInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      shortDescription: shortDescription.trim() || null,
      bedConfig: bedConfig.trim() || null,
      sizeSqm: sizeSqm ? parseFloat(sizeSqm) : null,
      maxAdults,
      maxChildren,
      extraBedAvailable,
      extraBedPriceMinor: extraBedMinor,
      basePriceMinor: baseMinor,
      weekendPriceMinor: weekendMinor,
      showPrice,
      breakfastIncluded,
      viewNotes: viewNotes.trim() || null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      isActive,
      unlockSlugConfirmed,
    };

    try {
      await onSave(payload);
      setSanityConfirmPending(false);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {validationError && (
        <div
          role="alert"
          className="rounded-card border-danger/40 bg-danger/10 text-small text-danger flex items-center gap-3 border p-4"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p>{validationError}</p>
        </div>
      )}

      {sanityConfirmPending && (
        <div
          role="region"
          aria-label="High price confirmation"
          className="border-warning/40 bg-warning/10 rounded-card text-small border p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="text-warning size-5 shrink-0" />
            <div>
              <p className="text-warning-contrast font-semibold">
                Unusually High Price Confirmation
              </p>
              <p className="text-muted mt-1">
                You entered a base price of <strong>₦{basePriceNaira}</strong>.
                This is higher than the typical sanity threshold (₦2,000,000).
                Please confirm if this rate is intentional.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={(e) => handleSubmit(e)}
                >
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
      <section className="rounded-card border-line bg-surface border p-6 shadow-sm">
        <h2 className="text-foreground text-h3 font-semibold">
          Room Type Identity
        </h2>
        <p className="text-small text-muted mt-1">
          Names, public URL slug, and layout specifications.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-1">
            <label className="text-foreground text-small block font-medium">
              Room Type Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Deluxe King Suite"
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div className="sm:col-span-1">
            <div className="flex items-center justify-between">
              <label className="text-foreground text-small block font-medium">
                URL Slug <span className="text-danger">*</span>
              </label>
              {isExisting && slugLocked && (
                <button
                  type="button"
                  onClick={() => {
                    if (isOwner) {
                      setSlugLocked(false);
                      setUnlockSlugConfirmed(true);
                    } else {
                      alert(
                        'Only an Owner can unlock and modify published room slugs.',
                      );
                    }
                  }}
                  className="text-brand flex items-center gap-1 text-xs hover:underline"
                >
                  <Lock className="size-3" /> Locked
                </button>
              )}
            </div>
            <div className="relative mt-1.5">
              <input
                type="text"
                required
                disabled={isExisting && slugLocked}
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="bg-background text-foreground focus:border-brand border-line disabled:bg-paper disabled:text-muted w-full rounded border px-3 py-2 focus:outline-none"
              />
              {isExisting && !slugLocked && (
                <span className="text-warning absolute top-2.5 right-3 text-xs">
                  <Unlock className="size-4" />
                </span>
              )}
            </div>
            {isExisting && !slugLocked && (
              <p className="text-warning mt-1 text-xs">
                Warning: Changing the slug breaks existing public bookmarks and
                links.
              </p>
            )}
          </div>

          {/* Short Description */}
          <div className="sm:col-span-2">
            <label className="text-foreground text-small block font-medium">
              Short Summary
            </label>
            <input
              type="text"
              maxLength={255}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary for search cards and listings"
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Full Description */}
          <div className="sm:col-span-2">
            <label className="text-foreground text-small block font-medium">
              Detailed Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of features, ambiance, and comfort..."
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Bed Config */}
          <div>
            <label className="text-foreground text-small block font-medium">
              Bed Configuration
            </label>
            <input
              type="text"
              value={bedConfig}
              onChange={(e) => setBedConfig(e.target.value)}
              placeholder="e.g. 1 King Bed or 2 Twin Beds"
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Size (sqm) */}
          <div>
            <label className="text-foreground text-small block font-medium">
              Room Size (sqm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={sizeSqm}
              onChange={(e) => setSizeSqm(e.target.value)}
              placeholder="e.g. 42"
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Occupancy */}
          <div>
            <label className="text-foreground text-small block font-medium">
              Max Adults <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={maxAdults}
              onChange={(e) => setMaxAdults(parseInt(e.target.value, 10) || 1)}
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-foreground text-small block font-medium">
              Max Children
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={maxChildren}
              onChange={(e) =>
                setMaxChildren(parseInt(e.target.value, 10) || 0)
              }
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Extra Bed */}
          <div className="border-line bg-paper/50 rounded border p-4 sm:col-span-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="extraBedAvailable"
                checked={extraBedAvailable}
                onChange={(e) => setExtraBedAvailable(e.target.checked)}
                className="text-brand focus:ring-brand size-4 rounded"
              />
              <label
                htmlFor="extraBedAvailable"
                className="text-foreground font-medium"
              >
                Extra Bed Allowed for this Room Type
              </label>
            </div>
            {extraBedAvailable && (
              <div className="mt-3 max-w-xs">
                <label className="text-muted block text-xs font-medium">
                  Extra Bed Price per Night (₦) — 0 means free
                </label>
                <div className="relative mt-1">
                  <span className="text-muted absolute top-2 left-3">₦</span>
                  <input
                    type="text"
                    value={extraBedPriceNaira}
                    onChange={(e) => setExtraBedPriceNaira(e.target.value)}
                    className="bg-background text-foreground focus:border-brand border-line text-small w-full rounded border py-1.5 pr-3 pl-8 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing & Visibility */}
      <section className="rounded-card border-line bg-surface border p-6 shadow-sm">
        <h2 className="text-foreground text-h3 font-semibold">
          Pricing & Publishing
        </h2>
        <p className="text-small text-muted mt-1">
          Base rates, weekend adjustments, and guest presentation settings.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Base Price */}
          <div>
            <label className="text-foreground text-small block font-medium">
              Base Nightly Price (₦) <span className="text-danger">*</span>
            </label>
            <div className="relative mt-1.5">
              <span className="text-muted absolute top-2 left-3">₦</span>
              <input
                type="text"
                required
                value={basePriceNaira}
                onChange={(e) => setBasePriceNaira(e.target.value)}
                placeholder="75,000"
                className="bg-background text-foreground focus:border-brand border-line w-full rounded border py-2 pr-3 pl-8 focus:outline-none"
              />
            </div>
            <p className="text-muted mt-1 text-xs">
              Applies to Sunday through Thursday nights unless overridden by
              rate rules.
            </p>
          </div>

          {/* Weekend Price */}
          <div>
            <label className="text-foreground text-small block font-medium">
              Weekend Price per Night (₦) — Optional
            </label>
            <div className="relative mt-1.5">
              <span className="text-muted absolute top-2 left-3">₦</span>
              <input
                type="text"
                value={weekendPriceNaira}
                onChange={(e) => setWeekendPriceNaira(e.target.value)}
                placeholder="Leave blank to use base price"
                className="bg-background text-foreground focus:border-brand border-line w-full rounded border py-2 pr-3 pl-8 focus:outline-none"
              />
            </div>
            <p className="text-muted mt-1 text-xs">
              Applies to Friday and Saturday nights.
            </p>
          </div>

          <div className="border-line/60 bg-paper/30 text-muted rounded border p-3 text-xs sm:col-span-2">
            <span className="text-foreground font-semibold">
              Snapshot Guarantee:
            </span>{' '}
            Modifying prices does not change existing bookings. Each reservation
            retains its original confirmed rate snapshot.
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showPrice"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
              className="text-brand focus:ring-brand size-4 rounded"
            />
            <label
              htmlFor="showPrice"
              className="text-foreground text-small font-medium"
            >
              Show price publicly on website
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="breakfastIncluded"
              checked={breakfastIncluded}
              onChange={(e) => setBreakfastIncluded(e.target.checked)}
              className="text-brand focus:ring-brand size-4 rounded"
            />
            <label
              htmlFor="breakfastIncluded"
              className="text-foreground text-small font-medium"
            >
              Complimentary Breakfast Included
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="text-brand focus:ring-brand size-4 rounded"
            />
            <label
              htmlFor="isActive"
              className="text-foreground text-small font-medium"
            >
              Active / Published (visible for bookings)
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="text-foreground text-small block font-medium">
              View & Floor Notes (Internal / Guest info)
            </label>
            <input
              type="text"
              value={viewNotes}
              onChange={(e) => setViewNotes(e.target.value)}
              placeholder="e.g. Ocean view, floors 2 to 4, quiet garden wing"
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* SEO & Search Preview */}
      <section className="rounded-card border-line bg-surface border p-6 shadow-sm">
        <h2 className="text-foreground text-h3 font-semibold">
          SEO & Search Snippet
        </h2>
        <p className="text-small text-muted mt-1">
          Customize how this room type appears in Google and Bing search
          results.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <div className="text-small flex justify-between font-medium">
              <label htmlFor="metaTitle">SEO Title</label>
              <span
                className={`text-xs ${metaTitle.length > 60 ? 'text-warning' : 'text-muted'}`}
              >
                {metaTitle.length} / 160 chars
              </span>
            </div>
            <input
              id="metaTitle"
              type="text"
              maxLength={160}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder={
                name
                  ? `${name} | Dela Boutique Hotel`
                  : 'Page title for search engines'
              }
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <div className="text-small flex justify-between font-medium">
              <label htmlFor="metaDescription">Meta Description</label>
              <span
                className={`text-xs ${metaDescription.length > 160 ? 'text-warning' : 'text-muted'}`}
              >
                {metaDescription.length} / 320 chars
              </span>
            </div>
            <textarea
              id="metaDescription"
              rows={2}
              maxLength={320}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="A brief, inviting description that appears beneath the search title"
              className="bg-background text-foreground focus:border-brand border-line mt-1.5 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Live Google Search Preview */}
          <div className="border-line bg-paper mt-4 rounded border p-4">
            <span className="text-muted text-xs font-semibold tracking-wider uppercase">
              Live Google Search Preview
            </span>
            <div className="mt-2 space-y-1">
              <p className="text-muted text-xs">
                https://hotel.example.com/rooms/{slug || 'room-slug'}
              </p>
              <p className="text-brand truncate text-base font-medium hover:underline">
                {metaTitle || name || 'Room Type Name'} | Dela Hotel
              </p>
              <p className="text-muted line-clamp-2 text-xs">
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
        <Button type="submit" disabled={isSaving} className="min-w-32">
          {isSaving
            ? 'Saving...'
            : isExisting
              ? 'Save Changes'
              : 'Create Room Type'}
        </Button>
      </div>
    </form>
  );
}
