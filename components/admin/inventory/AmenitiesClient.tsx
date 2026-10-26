'use client';

import {
  Bath,
  Car,
  Check,
  Coffee,
  DoorClosed,
  Dumbbell,
  Edit2,
  HelpCircle,
  Lamp,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Tv,
  Utensils,
  Waves,
  Wifi,
  Wind,
} from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminAmenity } from '@/types/inventory.types';

import { AmenityDialog } from './AmenityDialog';

interface AmenitiesClientProps {
  initialAmenities: AdminAmenity[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wifi,
  Tv,
  Coffee,
  Bath,
  Waves,
  Wind,
  Dumbbell,
  Sparkles,
  Utensils,
  Shield,
  Sun,
  Lamp,
  DoorClosed,
  Car,
};

export function AmenitiesClient({ initialAmenities }: AmenitiesClientProps) {
  const [amenities, setAmenities] = useState<AdminAmenity[]>(initialAmenities);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AdminAmenity | null>(
    null,
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listAmenities();
      if (res.data) {
        setAmenities(res.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reload amenities',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: AdminAmenity) {
    if (item.usageCount && item.usageCount > 0) {
      alert(
        `Cannot delete "${item.label}" because it is currently assigned to ${item.usageCount} room type(s). Remove it from those room types first.`,
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete amenity "${item.label}"?`)) {
      return;
    }

    try {
      await adminService.deleteAmenity(item.id);
      setSuccessMessage(`Amenity "${item.label}" deleted`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete amenity');
    }
  }

  function renderIcon(iconName: string | null) {
    if (!iconName)
      return <HelpCircle className="text-muted-foreground size-4" />;
    const Component = ICON_MAP[iconName] || HelpCircle;
    return <Component className="text-brand size-4" />;
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
          Catalogue of {amenities.length} amenities available for room type
          configuration.
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
          <Button
            size="sm"
            onClick={() => {
              setEditingAmenity(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> New Amenity
          </Button>
        </div>
      </div>

      {loading && amenities.length === 0 ? (
        <AdminLoading label="Loading amenities..." />
      ) : amenities.length === 0 ? (
        <AdminEmpty title="No amenities in catalogue">
          Create room amenities like Wi-Fi, air conditioning, bathtubs, and
          balconies.
        </AdminEmpty>
      ) : (
        <div className="rounded-card border-line bg-card overflow-hidden border">
          <Table className="text-small w-full text-left">
            <TableHeader className="border-line bg-paper text-muted-foreground border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 pr-2 pl-4 font-medium">
                  Icon
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Amenity</TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Unique Key
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Room Types Using
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                <TableHead className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-line divide-y">
              {amenities.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-paper/40 transition-colors"
                >
                  <TableCell className="py-3 pr-2 pl-4">
                    <div className="border-line bg-paper flex size-8 items-center justify-center rounded border">
                      {renderIcon(item.icon)}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <div>
                      <span className="text-foreground font-semibold">
                        {item.label}
                      </span>
                      {item.description && (
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground px-4 py-3 font-mono text-xs">
                    {item.key}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.usageCount && item.usageCount > 0
                          ? 'border-brand/30 bg-brand/15 text-brand'
                          : 'border-muted/30 bg-muted/15 text-muted-foreground'
                      }`}
                    >
                      {item.usageCount || 0} room type(s)
                    </Badge>
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
                        onClick={() => {
                          setEditingAmenity(item);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit ${item.label}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${item.label}`}
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

      {/* Amenity Dialog */}
      {dialogOpen && (
        <AmenityDialog
          key={editingAmenity?.id || 'new'}
          open={dialogOpen}
          amenity={editingAmenity}
          onClose={() => setDialogOpen(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
