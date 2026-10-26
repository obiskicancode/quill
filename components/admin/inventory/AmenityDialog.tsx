'use client';

import {
  AlertCircle,
  Bath,
  Car,
  Coffee,
  DoorClosed,
  Dumbbell,
  Lamp,
  Shield,
  Sparkles,
  Sun,
  Tv,
  Utensils,
  Waves,
  Wifi,
  Wind,
} from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import type { AdminAmenity, AdminAmenityInput } from '@/types/inventory.types';

interface AmenityDialogProps {
  open: boolean;
  amenity: AdminAmenity | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const AVAILABLE_ICONS = [
  { key: 'Wifi', icon: Wifi, label: 'Wi-Fi' },
  { key: 'Tv', icon: Tv, label: 'Smart TV' },
  { key: 'Coffee', icon: Coffee, label: 'Coffee' },
  { key: 'Bath', icon: Bath, label: 'Bathtub' },
  { key: 'Waves', icon: Waves, label: 'Pool / Ocean' },
  { key: 'Wind', icon: Wind, label: 'AC / Climate' },
  { key: 'Dumbbell', icon: Dumbbell, label: 'Fitness' },
  { key: 'Sparkles', icon: Sparkles, label: 'Luxury' },
  { key: 'Utensils', icon: Utensils, label: 'Dining' },
  { key: 'Shield', icon: Shield, label: 'Safe / Security' },
  { key: 'Sun', icon: Sun, label: 'Balcony / View' },
  { key: 'Lamp', icon: Lamp, label: 'Workspace' },
  { key: 'DoorClosed', icon: DoorClosed, label: 'Wardrobe' },
  { key: 'Car', icon: Car, label: 'Parking' },
];

function keyify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function AmenityDialog({
  open,
  amenity,
  onClose,
  onSaved,
}: AmenityDialogProps) {
  const isEditing = !!amenity?.id;

  const [label, setLabel] = useState(amenity?.label || '');
  const [key, setKey] = useState(amenity?.key || '');
  const [icon, setIcon] = useState(amenity?.icon || 'Wifi');
  const [description, setDescription] = useState(amenity?.description || '');
  const [isActive, setIsActive] = useState(amenity?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setErrorMessage('Label is required');
      return;
    }

    const cleanedKey = key.trim() || keyify(label);
    if (!/^[a-z0-9_]+$/.test(cleanedKey)) {
      setErrorMessage(
        'Key must consist of lowercase letters, numbers, and underscores',
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const input: AdminAmenityInput = {
      label: label.trim(),
      key: cleanedKey,
      icon,
      description: description.trim() || null,
      isActive,
      sortOrder: amenity ? amenity.sortOrder : 0,
    };

    try {
      if (isEditing && amenity?.id) {
        await adminService.updateAmenity(amenity.id, input);
      } else {
        await adminService.createAmenity(input);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save amenity',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="rounded-card border-line bg-surface max-h-[90vh] w-full max-w-lg overflow-y-auto border p-6 shadow-2xl">
        <h3 className="text-foreground text-h3 font-semibold">
          {isEditing ? 'Edit Amenity' : 'New Amenity'}
        </h3>
        <p className="text-small text-muted mt-1">
          Add or edit features in the hotel amenities catalogue.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="border-danger/40 bg-danger/10 text-danger mt-4 flex items-center gap-2 rounded border p-3 text-xs"
          >
            <AlertCircle className="size-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-small mt-4 space-y-4">
          <div>
            <label className="text-foreground block font-medium">
              Label <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!isEditing) setKey(keyify(e.target.value));
              }}
              placeholder="e.g. High-Speed Wi-Fi"
              className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-foreground block font-medium">
              Unique Key <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(keyify(e.target.value))}
              placeholder="e.g. high_speed_wifi"
              className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
            />
            <p className="text-muted mt-1 text-xs">
              Used in system filters and room templates (lowercase,
              underscores).
            </p>
          </div>

          {/* Visual Icon Picker */}
          <div>
            <label className="text-foreground block font-medium">
              Visual Icon
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIcon(item.key)}
                    className={`flex flex-col items-center justify-center rounded border p-2 transition-colors ${
                      isSelected
                        ? 'border-brand bg-brand/10 text-brand ring-brand ring-1'
                        : 'bg-background hover:text-foreground border-line text-muted hover:bg-paper'
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="size-5" />
                    <span className="mt-1 truncate text-[10px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-foreground block font-medium">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fibre optic 100Mbps unlimited wireless internet"
              className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="amenityActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="text-brand focus:ring-brand size-4 rounded"
            />
            <label
              htmlFor="amenityActive"
              className="text-foreground font-medium"
            >
              Active (available to assign to room types)
            </label>
          </div>

          <div className="border-line flex items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Amenity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
