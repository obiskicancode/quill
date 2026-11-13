'use client';

import {
  Bath,
  Car,
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

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
} from '@/components/admin/AdminStates';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useAmenities,
  useDeleteAmenity,
} from '@/hooks/services/admin/use-inventory';
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

/** Amenity catalogue with create/edit dialogs, usage counts and reordering. */
export function AmenitiesClient({ initialAmenities }: AmenitiesClientProps) {
  const confirm = useConfirm();
  const amenitiesQuery = useAmenities(initialAmenities);
  const deleteAmenity = useDeleteAmenity();
  const amenities = amenitiesQuery.data ?? [];
  const loading = amenitiesQuery.isFetching;
  const error =
    amenitiesQuery.error instanceof Error
      ? amenitiesQuery.error.message
      : amenitiesQuery.error
        ? ERROR_MESSAGES.FAILED_TO_RELOAD_AMENITIES
        : null;

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AdminAmenity | null>(
    null,
  );

  function openCreate() {
    setEditingAmenity(null);
    setDialogOpen(true);
  }

  async function refresh() {
    await amenitiesQuery.refetch();
  }

  async function handleDelete(item: AdminAmenity) {
    if (item.usageCount && item.usageCount > 0) {
      toast.add({
        title: ERROR_MESSAGES.CANNOT_DELETE_ASSIGNED_AMENITY(
          item.label,
          item.usageCount,
        ),
        type: 'error',
        priority: 'high',
      });
      return;
    }

    const sure = await confirm({
      title: `Delete amenity "${item.label}"?`,
      description: 'Rooms and pages that list it stop showing it right away.',
      confirmLabel: 'Delete amenity',
      tone: 'danger',
    });
    if (!sure) return;

    try {
      await deleteAmenity.mutateAsync(item.id);
      toast.add({
        title: SUCCESS_MESSAGES.AMENITY_DELETED_WITH_NAME(item.label),
        type: 'success',
      });
      await refresh();
    } catch (err) {
      toast.add({
        title:
          err instanceof Error
            ? err.message
            : ERROR_MESSAGES.FAILED_TO_DELETE_AMENITY,
        type: 'error',
        priority: 'high',
      });
    }
  }

  function renderIcon(iconName: string | null) {
    if (!iconName)
      return <HelpCircle className="size-4 text-muted-foreground" />;
    const Component = ICON_MAP[iconName] || HelpCircle;
    return <Component className="size-4 text-brand" />;
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
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New Amenity
          </Button>
        </div>
      </div>

      {loading && amenities.length === 0 ? (
        <AdminLoading label="Loading amenities..." />
      ) : amenities.length === 0 ? (
        <AdminEmpty
          title="No amenities in catalogue"
          action={
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" aria-hidden /> New Amenity
            </Button>
          }
        >
          Create room amenities like Wi-Fi, air conditioning, bathtubs, and
          balconies.
        </AdminEmpty>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <Table className="w-full text-left text-small">
            <TableHeader className="border-b border-line bg-paper text-muted-foreground">
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
            <TableBody className="divide-y divide-line">
              {amenities.map((item) => (
                <TableRow
                  key={item.id}
                  className="transition-colors hover:bg-paper/40"
                >
                  <TableCell className="py-3 pr-2 pl-4">
                    <div className="flex size-8 items-center justify-center rounded-sm border border-line bg-paper">
                      {renderIcon(item.icon)}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <div>
                      <span className="font-semibold text-foreground">
                        {item.label}
                      </span>
                      {item.description && (
                        <p className="line-clamp-1 text-caption text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3 font-mono text-caption text-muted-foreground">
                    {item.key}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant={
                        item.usageCount && item.usageCount > 0
                          ? 'brand'
                          : 'neutral'
                      }
                    >
                      {item.usageCount || 0} room type(s)
                    </Badge>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <AdminStatusBadge
                      tone={item.isActive ? 'success' : 'neutral'}
                      dot
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </AdminStatusBadge>
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
