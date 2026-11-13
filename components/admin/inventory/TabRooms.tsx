'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
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
  useCreateRoom,
  useDeleteRoom,
  useRoomImpact,
  useUpdateRoom,
} from '@/hooks/services/admin/use-inventory';
import type {
  AdminRoomUnit,
  RoomImpactCheckResponse,
  RoomStatus,
} from '@/types/inventory.types';

import { roomUnitFormSchema } from './form-schemas';

interface TabRoomsProps {
  roomTypeId: string;
  initialRooms: AdminRoomUnit[];
  onRefresh: () => Promise<void>;
}

type RoomUnitFormInput = z.input<typeof roomUnitFormSchema>;
type RoomUnitFormOutput = z.output<typeof roomUnitFormSchema>;

/** Physical-room manager for a room type, including status impact checks. */
export function TabRooms({
  roomTypeId,
  initialRooms,
  onRefresh,
}: TabRoomsProps) {
  const confirm = useConfirm();
  const rooms = initialRooms;
  const createRoom = useCreateRoom(roomTypeId);
  const updateRoom = useUpdateRoom(roomTypeId);
  const deleteRoom = useDeleteRoom(roomTypeId);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AdminRoomUnit | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const checkRoomImpact = useRoomImpact();

  const form = useForm<RoomUnitFormInput, unknown, RoomUnitFormOutput>({
    resolver: zodResolver(roomUnitFormSchema),
    defaultValues: {
      roomNumber: '',
      floor: '',
      status: 'active',
      notes: '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = form;

  // Impact Warning Dialog State
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactData, setImpactData] = useState<RoomImpactCheckResponse | null>(
    null,
  );
  const [pendingTargetStatus, setPendingTargetStatus] =
    useState<RoomStatus>('active');

  function openCreateDialog() {
    setEditingUnit(null);
    form.reset({
      roomNumber: '',
      floor: '',
      status: 'active',
      notes: '',
    });
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function openEditDialog(unit: AdminRoomUnit) {
    setEditingUnit(unit);
    form.reset({
      roomNumber: unit.roomNumber,
      floor: unit.floor || '',
      status: unit.status,
      notes: unit.notes || '',
    });
    setErrorMessage(null);
    setDialogOpen(true);
  }

  async function handleStatusSelect(newStatus: RoomStatus) {
    setValue('status', newStatus, { shouldValidate: true });

    // If editing existing unit and switching to maintenance or inactive
    if (
      editingUnit &&
      (newStatus === 'maintenance' || newStatus === 'inactive') &&
      editingUnit.status !== newStatus
    ) {
      try {
        const impact = await checkRoomImpact.mutateAsync(editingUnit.id);
        if (impact.hasImpact) {
          setImpactData(impact);
          setPendingTargetStatus(newStatus);
          setImpactModalOpen(true);
        }
      } catch {
        // Ignored, will be enforced on server submit anyway
      }
    }
  }

  async function handleSaveUnit(input: RoomUnitFormOutput) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (editingUnit) {
        await updateRoom.mutateAsync({
          roomId: editingUnit.id,
          input,
        });
        toast.add({
          title: SUCCESS_MESSAGES.ROOM_UPDATED_WITH_NUMBER(input.roomNumber),
          type: 'success',
        });
      } else {
        await createRoom.mutateAsync(input);
        toast.add({
          title: SUCCESS_MESSAGES.ROOM_ADDED_WITH_NUMBER(input.roomNumber),
          type: 'success',
        });
      }
      setDialogOpen(false);
      await onRefresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_SAVE_ROOM_UNIT,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(unit: AdminRoomUnit) {
    const sure = await confirm({
      title: `Delete room #${unit.roomNumber}?`,
      description:
        'If it has any past reservations, deletion will be blocked and you will be asked to deactivate it instead.',
      confirmLabel: 'Delete room',
      tone: 'danger',
    });
    if (!sure) return;

    try {
      await deleteRoom.mutateAsync(unit.id);
      toast.add({
        title: SUCCESS_MESSAGES.ROOM_DELETED_WITH_NUMBER(unit.roomNumber),
        type: 'success',
      });
      await onRefresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_DELETE_ROOM_UI,
      );
    }
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

      {/* Header */}
      <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-h3 font-semibold text-foreground">
            Room Units (Inventory)
          </h2>
          <p className="text-small text-muted-foreground">
            Manage physical rooms, numbers, floors, and current maintenance
            statuses.
          </p>
        </div>

        <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
          <Plus className="size-4" /> Add Room Unit
        </Button>
      </div>

      {/* Rooms Table */}
      {rooms.length === 0 ? (
        <div className="rounded-card border border-line bg-paper p-8 text-center text-muted-foreground">
          No room units assigned yet. Add physical rooms to enable booking
          assignments.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <Table className="w-full text-left text-small">
            <TableHeader className="border-b border-line bg-paper text-muted-foreground">
              <TableRow className="border-line hover:bg-transparent">
                <TableHead className="py-3 pr-3 pl-4 font-medium">
                  Room Number
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Floor</TableHead>
                <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                <TableHead className="px-4 py-3 font-medium">
                  Next Reservation / Block
                </TableHead>
                <TableHead className="px-4 py-3 font-medium">Notes</TableHead>
                <TableHead className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-line">
              {rooms.map((u) => (
                <TableRow
                  key={u.id}
                  className="border-line transition-colors hover:bg-paper/40"
                >
                  <TableCell className="py-3 pr-3 pl-4 font-semibold text-foreground">
                    {u.roomNumber}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {u.floor || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <AdminStatusBadge
                      tone={
                        u.status === 'active'
                          ? 'success'
                          : u.status === 'maintenance'
                            ? 'brand'
                            : 'neutral'
                      }
                      dot
                    >
                      {u.status === 'active'
                        ? 'Active'
                        : u.status === 'maintenance'
                          ? 'Maintenance'
                          : 'Inactive'}
                    </AdminStatusBadge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {u.nextReservation ? (
                      <div className="flex flex-col text-caption">
                        <Link
                          href={`/admin/reservations/${u.nextReservation.id}`}
                          className="font-medium text-brand-ink hover:underline"
                        >
                          {u.nextReservation.reference} (
                          {u.nextReservation.guestName})
                        </Link>
                        <span className="text-muted-foreground">
                          {u.nextReservation.checkIn} to{' '}
                          {u.nextReservation.checkOut}
                        </span>
                      </div>
                    ) : u.nextBlock ? (
                      <div className="flex flex-col text-caption text-muted-foreground">
                        <span className="font-medium text-brand-ink">
                          Blocked ({u.nextBlock.reason})
                        </span>
                        <span className="text-muted-foreground">
                          {u.nextBlock.startDate} to {u.nextBlock.endDate}
                        </span>
                      </div>
                    ) : (
                      <span className="text-caption text-muted-foreground">
                        None upcoming
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate px-4 py-3 text-caption text-muted-foreground">
                    {u.notes || '—'}
                  </TableCell>
                  <TableCell className="py-3 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => openEditDialog(u)}
                        aria-label={`Edit room ${u.roomNumber}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(u)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete room ${u.roomNumber}`}
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
        <DialogContent size="md">
          <form
            onSubmit={handleSubmit(handleSaveUnit)}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>
                {editingUnit
                  ? `Edit Room ${editingUnit.roomNumber}`
                  : 'Add Room Unit'}
              </DialogTitle>
              <DialogDescription>
                Configure room numbering and service availability.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <Field
                id="unit-room-number"
                label="Room Number *"
                error={errors.roomNumber?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="text"
                    placeholder="e.g. 101, 204B"
                    className={inputClass(errors.roomNumber?.message)}
                    {...register('roomNumber')}
                  />
                )}
              </Field>

              <Field
                id="unit-floor"
                label="Floor"
                error={errors.floor?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="text"
                    placeholder="e.g. 1st Floor, Ground Floor"
                    className={inputClass(errors.floor?.message)}
                    {...register('floor')}
                  />
                )}
              </Field>

              <Field
                id="unit-status"
                label="Service Status"
                error={errors.status?.message}
              >
                {(a11y) => (
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        items={[
                          {
                            value: 'active',
                            label: 'Active (Available for guest bookings)',
                          },
                          {
                            value: 'maintenance',
                            label: 'Maintenance (Out of order)',
                          },
                          {
                            value: 'inactive',
                            label: 'Inactive (Decommissioned)',
                          },
                        ]}
                        value={field.value}
                        onValueChange={(val) => {
                          if (val) handleStatusSelect(val as RoomStatus);
                        }}
                        name={field.name}
                      >
                        <SelectTrigger
                          id={a11y.id}
                          aria-describedby={a11y['aria-describedby']}
                          aria-invalid={a11y['aria-invalid']}
                          onBlur={field.onBlur}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            Active (Available for guest bookings)
                          </SelectItem>
                          <SelectItem value="maintenance">
                            Maintenance (Out of order)
                          </SelectItem>
                          <SelectItem value="inactive">
                            Inactive (Decommissioned)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>

              <Field
                id="unit-notes"
                label="Internal Notes"
                error={errors.notes?.message}
              >
                {(a11y) => (
                  <Textarea
                    {...a11y}
                    rows={2}
                    placeholder="e.g. Adjoining door to 102, corner window"
                    className={inputClass(errors.notes?.message)}
                    {...register('notes')}
                  />
                )}
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isSaving}>
                {editingUnit ? 'Save Changes' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {impactData && (
        <Dialog
          open={impactModalOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setImpactModalOpen(false);
              if (editingUnit) {
                setValue('status', editingUnit.status, {
                  shouldValidate: true,
                });
              }
            }
          }}
        >
          <DialogContent size="lg" className="border-destructive/40">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="size-6 shrink-0 text-destructive"
                  aria-hidden
                />
                <div>
                  <DialogTitle>
                    Status Change Blocked by Active Bookings
                  </DialogTitle>
                  <DialogDescription>
                    Cannot change status to{' '}
                    <strong>{pendingTargetStatus}</strong>. This room has active
                    or upcoming reservations that must be reassigned first.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogBody>
              {impactData.reservations.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-sm border border-line bg-paper p-3 text-caption">
                  <p className="font-semibold text-foreground">
                    Conflicting Reservations:
                  </p>
                  <ul className="mt-2 space-y-2">
                    {impactData.reservations.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between"
                      >
                        <span>
                          <strong>{r.reference}</strong> ({r.guestName}) &bull;{' '}
                          {r.checkIn} to {r.checkOut}
                        </span>
                        <Link
                          href={`/admin/reservations/${r.id}`}
                          className="font-medium text-brand-ink hover:underline"
                          target="_blank"
                        >
                          Reassign
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {impactData.blocks.length > 0 && (
                <div className="mt-3 rounded-sm border border-line bg-paper p-3 text-caption">
                  <p className="font-semibold text-foreground">
                    Conflicting Room Blocks:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {impactData.blocks.map((b) => (
                      <li key={b.id}>
                        {b.reason}: {b.startDate} to {b.endDate}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setImpactModalOpen(false);
                  if (editingUnit) {
                    setValue('status', editingUnit.status, {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                Understood (Keep Active)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
