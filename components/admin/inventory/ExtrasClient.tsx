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
import { Button } from '@/components/ui/Button';
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
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-small text-muted">
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
        <div className="rounded-card border-line bg-surface overflow-x-auto border">
          <table className="text-small w-full text-left">
            <thead className="border-line bg-paper text-muted border-b">
              <tr>
                <th className="py-3 pr-2 pl-4 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Extra / Add-on</th>
                <th className="px-4 py-3 font-medium">Price (₦)</th>
                <th className="px-4 py-3 font-medium">Pricing Unit</th>
                <th className="px-4 py-3 font-medium">Max Qty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {extras.map((item, idx) => (
                <tr
                  key={item.id}
                  className="hover:bg-paper/40 transition-colors"
                >
                  <td className="py-3 pr-2 pl-4">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="text-muted hover:bg-paper rounded p-1 disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === extras.length - 1}
                        aria-label="Move down"
                        className="text-muted hover:bg-paper rounded p-1 disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div>
                      <span className="text-foreground font-semibold">
                        {item.name}
                      </span>
                      {item.description && (
                        <p className="text-muted line-clamp-1 text-xs">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="text-foreground px-4 py-3 font-semibold">
                    ₦{minorToNaira(item.priceMinor)}
                  </td>

                  <td className="text-muted px-4 py-3">
                    {item.pricingUnit === 'per_stay'
                      ? 'Per stay'
                      : item.pricingUnit === 'per_night'
                        ? 'Per night'
                        : item.pricingUnit === 'per_guest'
                          ? 'Per guest'
                          : 'Per guest, per night'}
                  </td>

                  <td className="text-muted px-4 py-3">{item.maxQuantity}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.isActive
                          ? 'bg-success/15 text-success'
                          : 'bg-muted/20 text-muted'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          item.isActive ? 'bg-success' : 'bg-muted'
                        }`}
                      />
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="py-3 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="rounded-card border-line bg-surface max-h-[90vh] w-full max-w-lg overflow-y-auto border p-6 shadow-2xl">
            <h3 className="text-foreground text-h3 font-semibold">
              {editingExtra ? 'Edit Extra' : 'New Extra / Add-on'}
            </h3>
            <p className="text-small text-muted mt-1">
              Configure guest services, pricing calculations, and unit models.
            </p>

            {dialogError && (
              <div
                role="alert"
                className="border-danger/40 bg-danger/10 text-danger mt-4 flex items-center gap-2 rounded border p-3 text-xs"
              >
                <AlertCircle className="size-4 shrink-0" />
                <p>{dialogError}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="text-small mt-4 space-y-4">
              <div>
                <label className="text-foreground block font-medium">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingExtra) setSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. Airport Transfer (SUV)"
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-foreground block font-medium">
                  Slug <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="e.g. airport-transfer-suv"
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-foreground block font-medium">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Chauffeured pickup or drop-off to Murtala Muhammed Airport."
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground block font-medium">
                    Price in Naira (₦) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={priceNaira}
                    onChange={(e) => setPriceNaira(e.target.value)}
                    placeholder="25,000"
                    className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-foreground block font-medium">
                    Max Quantity per Booking
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={maxQuantity}
                    onChange={(e) =>
                      setMaxQuantity(parseInt(e.target.value, 10) || 1)
                    }
                    className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-foreground block font-medium">
                  Pricing Unit
                </label>
                <select
                  value={pricingUnit}
                  onChange={(e) =>
                    setPricingUnit(e.target.value as ExtraPricingUnit)
                  }
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                >
                  <option value="per_stay">
                    Per stay (flat fee regardless of duration or guests)
                  </option>
                  <option value="per_night">
                    Per night (charged for each night of stay)
                  </option>
                  <option value="per_guest">
                    Per guest (charged once per guest)
                  </option>
                  <option value="per_guest_per_night">
                    Per guest per night (e.g. breakfast buffet)
                  </option>
                </select>
              </div>

              {/* Live Calculation Preview */}
              <div className="border-line bg-paper rounded border p-3 text-xs">
                <span className="text-foreground font-semibold">
                  Live Calculation Example:
                </span>
                <p className="text-muted mt-1">
                  For a 3-night stay with 2 guests, 1 unit of this extra adds:{' '}
                  <strong className="text-brand">
                    ₦{minorToNaira(livePreviewTotalMinor)}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="extraActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="text-brand focus:ring-brand size-4 rounded"
                />
                <label
                  htmlFor="extraActive"
                  className="text-foreground font-medium"
                >
                  Active (offered during checkout)
                </label>
              </div>

              <div className="border-line flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? 'Saving...'
                    : editingExtra
                      ? 'Save Changes'
                      : 'Create Extra'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
