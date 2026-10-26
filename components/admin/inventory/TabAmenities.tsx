'use client';

import Link from 'next/link';
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminAmenity } from '@/types/inventory.types';

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
  const [allAmenities, setAllAmenities] = useState<AdminAmenity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(assignedAmenityIds),
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminService.listAmenities();
        if (res.data) {
          setAllAmenities(res.data);
        }
      } catch {
        setErrorMessage('Failed to load amenities catalog');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = allAmenities.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.key.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleAmenity(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function handleSelectAll() {
    const next = new Set(selectedIds);
    filtered.forEach((a) => next.add(a.id));
    setSelectedIds(next);
  }

  function handleClearAll() {
    setSelectedIds(new Set());
  }

  async function handleSave() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminService.updateRoomTypeAmenities(
        roomTypeId,
        Array.from(selectedIds),
      );
      setSuccessMessage('Amenities updated successfully');
      await onRefresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save amenities',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-card border-destructive/40 bg-destructive/10 text-small text-destructive flex items-center gap-3 border p-4"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-card border-success/40 bg-success/10 text-small text-success flex items-center gap-2 border p-4"
        >
          <Check className="size-5 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-h3 font-semibold">
            Room Amenities Checklist
          </h2>
          <p className="text-small text-muted-foreground">
            Select the amenities and facilities included in this room type.
          </p>
        </div>

        <Link
          href="/admin/amenities"
          className="text-primary flex items-center gap-1 text-xs hover:underline"
        >
          Manage Amenities Catalogue <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Search and Quick Filters */}
      <div className="rounded-card border-line bg-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
            variant="outline"
            onClick={handleSelectAll}
          >
            Select Filtered
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Grid of Amenity Checkboxes */}
      {filtered.length === 0 ? (
        <div className="rounded-card border-line bg-paper text-muted-foreground border p-8 text-center">
          No matching amenities found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const isChecked = selectedIds.has(a.id);
            return (
              <Label
                key={a.id}
                className={`rounded-card flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
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
                    <span className="text-foreground font-medium">
                      {a.label}
                    </span>
                    {a.icon && (
                      <span className="bg-paper text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                        {a.icon}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
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
      <div className="border-line flex items-center justify-between border-t pt-4">
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
