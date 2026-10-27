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
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
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
      setErrorMessage(ERROR_MESSAGES.AMENITY_LABEL_REQUIRED);
      return;
    }

    const cleanedKey = key.trim() || keyify(label);
    if (!/^[a-z0-9_]+$/.test(cleanedKey)) {
      setErrorMessage(ERROR_MESSAGES.KEY_PATTERN_INVALID_DESCRIPTION);
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
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_AMENITY,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onClose();
      }}
    >
      <DialogContent className="rounded-card border-line bg-card max-h-[90vh] max-w-lg gap-0 overflow-y-auto border p-0 shadow-2xl sm:max-w-lg">
        <DialogHeader className="border-line border-b p-6 pr-14 pb-4">
          <DialogTitle className="text-h3 text-foreground font-semibold">
            {isEditing ? 'Edit Amenity' : 'New Amenity'}
          </DialogTitle>
          <DialogDescription className="text-small text-muted-foreground">
            Add or edit features in the hotel amenities catalogue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="text-small space-y-4 p-6">
          {errorMessage && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10 text-destructive text-xs"
            >
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amenity-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amenity-label"
              type="text"
              required
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!isEditing) setKey(keyify(e.target.value));
              }}
              placeholder="e.g. High-Speed Wi-Fi"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amenity-key">
              Unique Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amenity-key"
              type="text"
              required
              value={key}
              onChange={(e) => setKey(keyify(e.target.value))}
              placeholder="e.g. high_speed_wifi"
            />
            <p className="text-muted-foreground text-xs">
              Used in system filters and room templates (lowercase,
              underscores).
            </p>
          </div>

          {/* Visual Icon Picker */}
          <div className="space-y-1.5">
            <Label>Visual Icon</Label>
            <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.key;
                return (
                  <Button
                    key={item.key}
                    type="button"
                    variant={isSelected ? 'secondary' : 'outline'}
                    onClick={() => setIcon(item.key)}
                    className={`h-auto flex-col p-2 text-xs ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary ring-primary ring-1'
                        : ''
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="size-5" />
                    <span className="mt-1 truncate text-[0.625rem]">
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amenity-description">Description (Optional)</Label>
            <Textarea
              id="amenity-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fibre optic 100Mbps unlimited wireless internet"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <Checkbox
              id="amenityActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="amenityActive" className="cursor-pointer">
              Active (available to assign to room types)
            </Label>
          </div>

          <DialogFooter className="border-line border-t bg-transparent px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSaving}>
              {isEditing ? 'Save Changes' : 'Create Amenity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
