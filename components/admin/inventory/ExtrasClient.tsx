'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Edit2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCreateExtra,
  useDeleteExtra,
  useExtras,
  useReorderExtras,
  useUpdateExtra,
} from '@/hooks/services/admin/use-inventory';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { minorToNaira, nairaToMinor } from '@/lib/rate-resolution';
import type {
  AdminExtra,
  ExtraInput,
  ExtraPricingUnit,
} from '@/types/inventory.types';

import { extraFormSchema, slugify } from './form-schemas';

interface ExtrasClientProps {
  initialExtras: AdminExtra[];
}

type ExtraFormInput = z.input<typeof extraFormSchema>;
type ExtraFormOutput = z.output<typeof extraFormSchema>;

export function ExtrasClient({ initialExtras }: ExtrasClientProps) {
  const extrasQuery = useExtras(initialExtras);
  const createExtra = useCreateExtra();
  const updateExtra = useUpdateExtra();
  const deleteExtra = useDeleteExtra();
  const reorderExtras = useReorderExtras();
  const [extras, setExtras] = useState<AdminExtra[]>(initialExtras);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<AdminExtra | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const loading = extrasQuery.isFetching;
  const error =
    extrasQuery.error instanceof Error
      ? extrasQuery.error.message
      : extrasQuery.error
        ? ERROR_MESSAGES.FAILED_TO_RELOAD_EXTRAS
        : null;

  const form = useForm<ExtraFormInput, unknown, ExtraFormOutput>({
    resolver: zodResolver(extraFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      priceNaira: '25,000',
      pricingUnit: 'per_stay',
      maxQuantity: 5,
      isActive: true,
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError: setFieldError,
    setValue,
    watch,
  } = form;
  const priceNaira = watch('priceNaira');
  const pricingUnit = watch('pricingUnit') as ExtraPricingUnit;

  const isSaving =
    isSubmitting || createExtra.isPending || updateExtra.isPending;

  useEffect(() => {
    if (extrasQuery.data) setExtras(extrasQuery.data);
  }, [extrasQuery.data]);

  async function refresh() {
    await extrasQuery.refetch();
  }

  function openCreateDialog() {
    setEditingExtra(null);
    reset({
      name: '',
      slug: '',
      description: '',
      priceNaira: '25,000',
      pricingUnit: 'per_stay',
      maxQuantity: 5,
      isActive: true,
    });
    setDialogError(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: AdminExtra) {
    setEditingExtra(item);
    reset({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      priceNaira: minorToNaira(item.priceMinor),
      pricingUnit: item.pricingUnit,
      maxQuantity: item.maxQuantity,
      isActive: item.isActive,
    });
    setDialogError(null);
    setDialogOpen(true);
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= extras.length) return;

    const updated = [...extras];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const items = updated.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1,
    }));

    setExtras(updated);
    try {
      await reorderExtras.mutateAsync(items);
      toast.add({ title: SUCCESS_MESSAGES.EXTRAS_REORDERED, type: 'success' });
    } catch {
      await refresh();
    }
  }

  async function handleSave(input: ExtraFormOutput) {
    setDialogError(null);

    const { priceNaira, ...rest } = input;
    const payload: ExtraInput = {
      ...rest,
      priceMinor: nairaToMinor(priceNaira),
      sortOrder: editingExtra ? editingExtra.sortOrder : extras.length + 1,
    };

    try {
      if (editingExtra) {
        await updateExtra.mutateAsync({
          id: editingExtra.id,
          input: payload,
        });
        toast.add({
          title: SUCCESS_MESSAGES.EXTRA_UPDATED_WITH_NAME(input.name),
          type: 'success',
        });
      } else {
        await createExtra.mutateAsync(payload);
        toast.add({
          title: SUCCESS_MESSAGES.EXTRA_CREATED_WITH_NAME(input.name),
          type: 'success',
        });
      }
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setDialogError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_EXTRA,
      );
      applyServerFieldErrors(setFieldError, err);
    }
  }

  async function handleDelete(item: AdminExtra) {
    if (
      !confirm(
        `Are you sure you want to delete "${item.name}"? If it has been booked in existing reservations, deletion will be blocked and you must deactivate it instead.`,
      )
    ) {
      return;
    }

    try {
      await deleteExtra.mutateAsync(item.id);
      toast.add({
        title: SUCCESS_MESSAGES.EXTRA_DELETED_WITH_NAME(item.name),
        type: 'success',
      });
      await refresh();
    } catch (err) {
      toast.add({
        title:
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_DELETE_EXTRA,
        type: 'error',
        priority: 'high',
      });
    }
  }

  // Calculate live preview for dialog: 3 nights, 2 guests, quantity 1
  const previewUnitPriceMinor = nairaToMinor(priceNaira || '');
  let livePreviewTotalMinor = 0;
  if (pricingUnit === 'per_stay') {
    livePreviewTotalMinor = previewUnitPriceMinor * 1;
  } else if (pricingUnit === 'per_night') {
    livePreviewTotalMinor = previewUnitPriceMinor * 3; // 3 nights
  } else if (pricingUnit === 'per_guest') {
    livePreviewTotalMinor = previewUnitPriceMinor * 2; // 2 guests
  } else if (pricingUnit === 'per_guest_per_night') {
    livePreviewTotalMinor = previewUnitPriceMinor * 2 * 3; // 2 guests * 3 nights
  }

  return (
    <div className="space-y-6">
      {error && (
        <AdminError
          message={error}
          action={
            <Button size="sm" variant="secondary" onClick={refresh}>
              Retry
            </Button>
          }
        />
      )}

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-small text-muted-foreground">
          Showing {extras.length} extras and add-on services. Reorder to change
          appearance in guest booking flow.
        </p>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="size-4" /> New Extra
          </Button>
        </div>
      </div>

      {loading && extras.length === 0 ? (
        <AdminLoading label="Loading extras..." />
      ) : extras.length === 0 ? (
        <AdminEmpty title="No extras found">
          Add paid add-ons such as airport transfers, champagne on arrival,
          breakfast, or spa packages.
        </AdminEmpty>
      ) : (
        <div className="rounded-card border-line bg-card overflow-hidden border">
          <Table className="text-small w-full text-left">
            <TableHeader className="border-line bg-paper text-muted-foreground border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 pr-2 pl-4 font-medium">
                  Order
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Extra / Add-on
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Price (₦)
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Pricing Unit
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Max Qty</TableHead>
                <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                <TableHead className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-line divide-y">
              {extras.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-paper/40 transition-colors"
                >
                  <TableCell className="py-3 pr-2 pl-4">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === extras.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <div>
                      <span className="text-foreground font-semibold">
                        {item.name}
                      </span>
                      {item.description && (
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-foreground px-4 py-3 font-semibold">
                    ₦{minorToNaira(item.priceMinor)}
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4 py-3">
                    {item.pricingUnit === 'per_stay'
                      ? 'Per stay'
                      : item.pricingUnit === 'per_night'
                        ? 'Per night'
                        : item.pricingUnit === 'per_guest'
                          ? 'Per guest'
                          : 'Per guest, per night'}
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4 py-3">
                    {item.maxQuantity}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.isActive
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-muted/30 bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          item.isActive ? 'bg-success' : 'bg-muted'
                        }`}
                      />
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isSaving) setDialogOpen(false);
        }}
      >
        <DialogContent className="rounded-card border-line bg-card max-h-[90vh] max-w-lg gap-0 overflow-y-auto border p-0 shadow-2xl sm:max-w-lg">
          <DialogHeader className="border-line border-b p-6 pr-14 pb-4">
            <DialogTitle className="text-h3 text-foreground font-semibold">
              {editingExtra ? 'Edit Extra' : 'New Extra / Add-on'}
            </DialogTitle>
            <DialogDescription className="text-small text-muted-foreground">
              Configure guest services, pricing calculations, and unit models.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(handleSave)}
            className="text-small space-y-4 p-6"
            noValidate
          >
            {dialogError && (
              <Alert
                variant="destructive"
                className="border-destructive/40 bg-destructive/10 text-destructive text-xs"
              >
                <AlertCircle className="size-4 shrink-0" />
                <p>{dialogError}</p>
              </Alert>
            )}
            <Field id="extra-name" label="Name *" error={errors.name?.message}>
              {(a11y) => (
                <Input
                  {...a11y}
                  type="text"
                  placeholder="e.g. Airport Transfer (SUV)"
                  className={inputClass(errors.name?.message)}
                  {...register('name', {
                    onChange: (event) => {
                      if (!editingExtra) {
                        setValue('slug', slugify(event.target.value));
                      }
                    },
                  })}
                />
              )}
            </Field>

            <Field id="extra-slug" label="Slug *" error={errors.slug?.message}>
              {(a11y) => (
                <Input
                  {...a11y}
                  type="text"
                  placeholder="e.g. airport-transfer-suv"
                  className={inputClass(errors.slug?.message)}
                  {...register('slug', {
                    onChange: (event) =>
                      setValue('slug', slugify(event.target.value)),
                  })}
                />
              )}
            </Field>

            <Field
              id="extra-description"
              label="Description"
              error={errors.description?.message}
            >
              {(a11y) => (
                <Textarea
                  {...a11y}
                  rows={2}
                  placeholder="e.g. Chauffeured pickup or drop-off to Murtala Muhammed Airport."
                  className={inputClass(errors.description?.message)}
                  {...register('description')}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                id="extra-price"
                label="Price in Naira (₦) *"
                error={errors.priceNaira?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="text"
                    placeholder="25,000"
                    className={inputClass(errors.priceNaira?.message)}
                    {...register('priceNaira')}
                  />
                )}
              </Field>

              <Field
                id="extra-max-qty"
                label="Max Quantity per Booking"
                error={errors.maxQuantity?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="number"
                    min="1"
                    max="50"
                    className={inputClass(errors.maxQuantity?.message)}
                    {...register('maxQuantity', { valueAsNumber: true })}
                  />
                )}
              </Field>
            </div>

            <Field
              id="extra-pricing-unit"
              label="Pricing Unit"
              error={errors.pricingUnit?.message}
            >
              {(a11y) => (
                <Controller
                  control={control}
                  name="pricingUnit"
                  render={({ field }) => (
                    <Select
                      items={[
                        {
                          value: 'per_stay',
                          label:
                            'Per stay (flat fee regardless of duration or guests)',
                        },
                        {
                          value: 'per_night',
                          label: 'Per night (charged for each night of stay)',
                        },
                        {
                          value: 'per_guest',
                          label: 'Per guest (charged once per guest)',
                        },
                        {
                          value: 'per_guest_per_night',
                          label: 'Per guest per night (e.g. breakfast buffet)',
                        },
                      ]}
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                      disabled={isSaving}
                    >
                      <SelectTrigger
                        id={a11y.id}
                        aria-describedby={a11y['aria-describedby']}
                        aria-invalid={a11y['aria-invalid']}
                        onBlur={field.onBlur}
                        className={inputClass(errors.pricingUnit?.message)}
                      >
                        <SelectValue placeholder="Select pricing unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_stay">
                          Per stay (flat fee regardless of duration or guests)
                        </SelectItem>
                        <SelectItem value="per_night">
                          Per night (charged for each night of stay)
                        </SelectItem>
                        <SelectItem value="per_guest">
                          Per guest (charged once per guest)
                        </SelectItem>
                        <SelectItem value="per_guest_per_night">
                          Per guest per night (e.g. breakfast buffet)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>

            {/* Live Calculation Preview */}
            <div className="border-line bg-paper rounded border p-3 text-xs">
              <span className="text-foreground font-semibold">
                Live Calculation Example:
              </span>
              <p className="text-muted-foreground mt-1">
                For a 3-night stay with 2 guests, 1 unit of this extra adds:{' '}
                <strong className="text-primary font-bold">
                  ₦{minorToNaira(livePreviewTotalMinor)}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Checkbox
                    id="extraActive"
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
              <Label htmlFor="extraActive" className="cursor-pointer">
                Active (offered during checkout)
              </Label>
            </div>

            <DialogFooter className="border-line border-t bg-transparent px-0 pb-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isSaving}>
                {editingExtra ? 'Save Changes' : 'Create Extra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
