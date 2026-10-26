'use client';

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Edit2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
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
import { minorToNaira, nairaToMinor } from '@/lib/rate-resolution';
import type {
  AdminExtra,
  AdminExtraInput,
  ExtraPricingUnit,
} from '@/types/inventory.types';

interface ExtrasClientProps {
  initialExtras: AdminExtra[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ExtrasClient({ initialExtras }: ExtrasClientProps) {
  const [extras, setExtras] = useState<AdminExtra[]>(initialExtras);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<AdminExtra | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceNaira, setPriceNaira] = useState('25,000');
  const [pricingUnit, setPricingUnit] = useState<ExtraPricingUnit>('per_stay');
  const [maxQuantity, setMaxQuantity] = useState(5);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listExtras();
      if (res.data) {
        setExtras(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload extras');
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingExtra(null);
    setName('');
    setSlug('');
    setDescription('');
    setPriceNaira('25,000');
    setPricingUnit('per_stay');
    setMaxQuantity(5);
    setIsActive(true);
    setDialogError(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: AdminExtra) {
    setEditingExtra(item);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description || '');
    setPriceNaira(minorToNaira(item.priceMinor));
    setPricingUnit(item.pricingUnit);
    setMaxQuantity(item.maxQuantity);
    setIsActive(item.isActive);
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
      await adminService.reorderExtras(items);
    } catch {
      await refresh();
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setDialogError('Extra name is required');
      return;
    }

    const priceMinor = nairaToMinor(priceNaira);
    const input: AdminExtraInput = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      description: description.trim() || null,
      priceMinor,
      pricingUnit,
      maxQuantity,
      isActive,
      sortOrder: editingExtra ? editingExtra.sortOrder : extras.length + 1,
    };

    setIsSaving(true);
    setDialogError(null);

    try {
      if (editingExtra) {
        await adminService.updateExtra(editingExtra.id, input);
        setSuccessMessage(`Extra "${name}" updated successfully`);
      } else {
        await adminService.createExtra(input);
        setSuccessMessage(`Extra "${name}" created successfully`);
      }
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setDialogError(
        err instanceof Error ? err.message : 'Failed to save extra',
      );
    } finally {
      setIsSaving(false);
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
      await adminService.deleteExtra(item.id);
      setSuccessMessage(`Extra "${item.name}" deleted`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete extra');
    }
  }

  // Calculate live preview for dialog: 3 nights, 2 guests, quantity 1
  const previewUnitPriceMinor = nairaToMinor(priceNaira);
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

      {successMessage && (
        <div
          role="status"
          className="rounded-card border-success/40 bg-success/10 text-small text-success flex items-center justify-between border p-4"
        >
          <div className="flex items-center gap-2">
            <Check className="size-5 shrink-0" />
            <p>{successMessage}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="text-success hover:text-success hover:bg-success/15 h-7 text-xs"
          >
            Dismiss
          </Button>
        </div>
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

          <form onSubmit={handleSave} className="text-small space-y-4 p-6">
            {dialogError && (
              <Alert
                variant="destructive"
                className="border-destructive/40 bg-destructive/10 text-destructive text-xs"
              >
                <AlertCircle className="size-4 shrink-0" />
                <p>{dialogError}</p>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="extra-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="extra-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingExtra) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Airport Transfer (SUV)"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extra-slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="extra-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="e.g. airport-transfer-suv"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extra-description">Description</Label>
              <Textarea
                id="extra-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Chauffeured pickup or drop-off to Murtala Muhammed Airport."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="extra-price">
                  Price in Naira (₦) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="extra-price"
                  type="text"
                  required
                  value={priceNaira}
                  onChange={(e) => setPriceNaira(e.target.value)}
                  placeholder="25,000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="extra-max-qty">Max Quantity per Booking</Label>
                <Input
                  id="extra-max-qty"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={maxQuantity}
                  onChange={(e) =>
                    setMaxQuantity(parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extra-pricing-unit">Pricing Unit</Label>
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
                value={pricingUnit}
                onValueChange={(val) => {
                  if (val) setPricingUnit(val as ExtraPricingUnit);
                }}
              >
                <SelectTrigger id="extra-pricing-unit" className="w-full">
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
            </div>

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
              <Checkbox
                id="extraActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
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
