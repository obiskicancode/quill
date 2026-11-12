'use client';

import Link from 'next/link';
import { AlertCircle, ExternalLink, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useAmenities,
  useUpdateRoomTypeAmenities,
} from '@/hooks/services/admin/use-inventory';

interface TabAmenitiesProps {
  roomTypeId: string;
  assignedAmenityIds: string[];
  onRefresh: () => Promise<void>;
}

export function TabAmenities({
  roomTypeId,
  assignedAmenityIds,
  onRefresh,
}: TabAmenitiesProps) {
  const amenitiesQuery = useAmenities();
  const updateAmenities = useUpdateRoomTypeAmenities(roomTypeId);
  const allAmenities = amenitiesQuery.data ?? [];
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = updateAmenities.isPending;
  const loading = amenitiesQuery.isLoading;
  const errorMessage =
    saveError ??
    (amenitiesQuery.error
      ? ERROR_MESSAGES.FAILED_TO_LOAD_AMENITIES_CATALOG
      : null);

  const selectedIds = useMemo(() => {
    const next = new Set(assignedAmenityIds);
    for (const [id, selected] of Object.entries(overrides)) {
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    return next;
  }, [assignedAmenityIds, overrides]);

  const filtered = allAmenities.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.key.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleAmenity(id: string) {
    setOverrides((prev) => ({
      ...prev,
      [id]: !selectedIds.has(id),
    }));
  }

  function handleSelectAll() {
    setOverrides((prev) => {
      const next = { ...prev };
      filtered.forEach((a) => {
        next[a.id] = true;
      });
      return next;
    });
  }

  function handleClearAll() {
    setOverrides((prev) => {
      const next = { ...prev };
      allAmenities.forEach((a) => {
        next[a.id] = false;
      });
      assignedAmenityIds.forEach((id) => {
        next[id] = false;
      });
      return next;
    });
  }

  async function handleSave() {
    setSaveError(null);

    try {
      await updateAmenities.mutateAsync(Array.from(selectedIds));
      toast.add({ title: SUCCESS_MESSAGES.AMENITIES_UPDATED, type: 'success' });
      await onRefresh();
      setOverrides({});
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_AMENITIES,
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert
          variant="destructive"
          size="panel"
          className="items-center gap-3"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p className="col-start-2">{errorMessage}</p>
        </Alert>
      )}

      <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-h3 font-semibold text-foreground">
            Room Amenities Checklist
          </h2>
          <p className="text-small text-muted-foreground">
            Select the amenities and facilities included in this room type.
          </p>
        </div>

        <Link
          href="/admin/amenities"
          className="flex items-center gap-1 text-caption text-brand-ink hover:underline"
        >
          Manage Amenities Catalogue <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex flex-col flex-wrap gap-3 rounded-card border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search amenities (e.g. Wi-Fi, Balcony, Minibar)..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSelectAll}
          >
            Select Filtered
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Grid of Amenity Checkboxes */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-paper p-8 text-center text-muted-foreground">
          No matching amenities found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const isChecked = selectedIds.has(a.id);
            return (
              <Label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors ${
                  isChecked
                    ? 'border-primary bg-primary/5'
                    : 'border-line bg-card hover:bg-paper/40'
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleAmenity(a.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {a.label}
                    </span>
                    {a.icon && (
                      <span className="rounded-sm bg-paper px-1.5 py-0.5 text-caption text-muted-foreground">
                        {a.icon}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">
                      {a.description}
                    </p>
                  )}
                </div>
              </Label>
            );
          })}
        </div>
      )}

      {/* Action footer */}
      <div className="flex items-center justify-between border-t border-line pt-4">
        <p className="text-small text-muted-foreground">
          {selectedIds.size} of {allAmenities.length} amenities selected
        </p>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-w-32"
        >
          {saving ? 'Saving...' : 'Save Amenities'}
        </Button>
      </div>
    </div>
  );
}
