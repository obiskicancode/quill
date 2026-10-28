'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

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
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCreateAmenity,
  useUpdateAmenity,
} from '@/hooks/services/admin/use-inventory';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import type { AdminAmenity, AdminAmenityInput } from '@/types/inventory.types';

import { amenityFormSchema, keyify } from './form-schemas';

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

type AmenityFormInput = z.input<typeof amenityFormSchema>;
type AmenityFormOutput = z.output<typeof amenityFormSchema>;

export function AmenityDialog({
  open,
  amenity,
  onClose,
  onSaved,
}: AmenityDialogProps) {
  const isEditing = !!amenity?.id;
  const createAmenity = useCreateAmenity();
  const updateAmenity = useUpdateAmenity();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<AmenityFormInput, unknown, AmenityFormOutput>({
    resolver: zodResolver(amenityFormSchema),
    defaultValues: {
      label: amenity?.label || '',
      key: amenity?.key || '',
      icon: amenity?.icon || 'Wifi',
      description: amenity?.description || '',
      isActive: amenity?.isActive ?? true,
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError: setFieldError,
    setValue,
    watch,
  } = form;

  const icon = watch('icon') || 'Wifi';
  const busy =
    isSubmitting || createAmenity.isPending || updateAmenity.isPending;

  async function handleFormSubmit(input: AmenityFormOutput) {
    setErrorMessage(null);

    const payload: AdminAmenityInput = {
      ...input,
      sortOrder: amenity ? amenity.sortOrder : 0,
    };

    try {
      if (isEditing && amenity?.id) {
        await updateAmenity.mutateAsync({ id: amenity.id, input: payload });
        toast.add({ title: SUCCESS_MESSAGES.AMENITY_UPDATED, type: 'success' });
      } else {
        await createAmenity.mutateAsync(payload);
        toast.add({ title: SUCCESS_MESSAGES.AMENITY_CREATED, type: 'success' });
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_AMENITY,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
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

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="text-small space-y-4 p-6"
          noValidate
        >
          {errorMessage && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10 text-destructive text-xs"
            >
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </Alert>
          )}

          <Field
            id="amenity-label"
            label="Label *"
            error={errors.label?.message}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                placeholder="e.g. High-Speed Wi-Fi"
                className={inputClass(errors.label?.message)}
                {...register('label', {
                  onChange: (event) => {
                    if (!isEditing) {
                      setValue('key', keyify(event.target.value));
                    }
                  },
                })}
              />
            )}
          </Field>

          <Field
            id="amenity-key"
            label="Unique Key *"
            error={errors.key?.message}
            hint="Used in system filters and room templates (lowercase, underscores)."
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                placeholder="e.g. high_speed_wifi"
                className={inputClass(errors.key?.message)}
                {...register('key', {
                  onChange: (event) =>
                    setValue('key', keyify(event.target.value)),
                })}
              />
            )}
          </Field>

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
                    onClick={() => setValue('icon', item.key)}
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

          <Field
            id="amenity-description"
            label="Description (Optional)"
            error={errors.description?.message}
          >
            {(a11y) => (
              <Textarea
                {...a11y}
                rows={2}
                placeholder="e.g. Fibre optic 100Mbps unlimited wireless internet"
                className={inputClass(errors.description?.message)}
                {...register('description')}
              />
            )}
          </Field>

          <div className="flex items-center gap-2.5 pt-2">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Checkbox
                  id="amenityActive"
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
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={busy}>
              {isEditing ? 'Save Changes' : 'Create Amenity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
