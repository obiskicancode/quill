'use client';

import Link from 'next/link';
import { AlertCircle, Check, Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type {
  AdminRoomUnit,
  AdminRoomUnitInput,
  RoomImpactCheckResponse,
  RoomStatus,
} from '@/types/inventory.types';

interface TabRoomsProps {
  roomTypeId: string;
  initialRooms: AdminRoomUnit[];
  onRefresh: () => Promise<void>;
}

export function TabRooms({
  roomTypeId,
  initialRooms,
  onRefresh,
}: TabRoomsProps) {
  const rooms = initialRooms;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AdminRoomUnit | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [status, setStatus] = useState<RoomStatus>('active');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Impact Warning Dialog State
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactData, setImpactData] = useState<RoomImpactCheckResponse | null>(
    null,
  );
  const [pendingTargetStatus, setPendingTargetStatus] =
    useState<RoomStatus>('active');

  function openCreateDialog() {
    setEditingUnit(null);
    setRoomNumber('');
    setFloor('');
    setStatus('active');
    setNotes('');
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function openEditDialog(unit: AdminRoomUnit) {
    setEditingUnit(unit);
    setRoomNumber(unit.roomNumber);
    setFloor(unit.floor || '');
    setStatus(unit.status);
    setNotes(unit.notes || '');
    setErrorMessage(null);
    setDialogOpen(true);
  }

  async function handleStatusSelect(newStatus: RoomStatus) {
    setStatus(newStatus);
    // If editing existing unit and switching to maintenance or inactive
    if (
      editingUnit &&
      (newStatus === 'maintenance' || newStatus === 'inactive') &&
      editingUnit.status !== newStatus
    ) {
      try {
        const res = await adminService.checkRoomImpact(editingUnit.id);
        if (res.data?.hasImpact) {
          setImpactData(res.data);
          setPendingTargetStatus(newStatus);
          setImpactModalOpen(true);
        }
      } catch {
        // Ignored, will be enforced on server submit anyway
      }
    }
  }

  async function handleSaveUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setErrorMessage(ERROR_MESSAGES.ROOM_NUMBER_REQUIRED);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const input: AdminRoomUnitInput = {
      roomNumber: roomNumber.trim(),
      floor: floor.trim() || null,
      status,
      notes: notes.trim() || null,
      isActive: status === 'active',
    };

    try {
      if (editingUnit) {
        await adminService.updateRoom(editingUnit.id, input);
        setSuccessMessage(
          SUCCESS_MESSAGES.ROOM_UPDATED_WITH_NUMBER(roomNumber),
        );
      } else {
        await adminService.createRoom({ ...input, roomTypeId });
        setSuccessMessage(SUCCESS_MESSAGES.ROOM_ADDED_WITH_NUMBER(roomNumber));
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
    if (
      !confirm(
        `Are you sure you want to delete room "${unit.roomNumber}"? If it has any past reservations, deletion will be blocked and you will be asked to deactivate it instead.`,
      )
    ) {
      return;
    }

    try {
      await adminService.deleteRoom(unit.id);
      setSuccessMessage(
        SUCCESS_MESSAGES.ROOM_DELETED_WITH_NUMBER(unit.roomNumber),
      );
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

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-h3 font-semibold">
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
        <div className="rounded-card border-line bg-paper text-muted-foreground border p-8 text-center">
          No room units assigned yet. Add physical rooms to enable booking
          assignments.
        </div>
      ) : (
        <div className="rounded-card border-line bg-card overflow-x-auto border">
          <Table className="text-small w-full text-left">
            <TableHeader className="border-line bg-paper text-muted-foreground border-b">
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
            <TableBody className="divide-line divide-y">
              {rooms.map((u) => (
                <TableRow
                  key={u.id}
                  className="hover:bg-paper/40 border-line transition-colors"
                >
                  <TableCell className="text-foreground py-3 pr-3 pl-4 font-semibold">
                    {u.roomNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 py-3">
                    {u.floor || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.status === 'active'
                          ? 'border-success/20 bg-success/15 text-success'
                          : u.status === 'maintenance'
                            ? 'border-primary/30 bg-primary/15 text-brand-ink'
                            : 'border-muted/30 bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          u.status === 'active'
                            ? 'bg-success'
                            : u.status === 'maintenance'
                              ? 'bg-primary'
                              : 'bg-muted'
                        }`}
                      />
                      {u.status === 'active'
                        ? 'Active'
                        : u.status === 'maintenance'
                          ? 'Maintenance'
                          : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {u.nextReservation ? (
                      <div className="flex flex-col text-xs">
                        <Link
                          href={`/admin/reservations/${u.nextReservation.id}`}
                          className="text-primary font-medium hover:underline"
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
                      <div className="text-muted-foreground flex flex-col text-xs">
                        <span className="text-brand-ink font-medium">
                          Blocked ({u.nextBlock.reason})
                        </span>
                        <span className="text-muted-foreground">
                          {u.nextBlock.startDate} to {u.nextBlock.endDate}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        None upcoming
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate px-4 py-3 text-xs">
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
        <DialogContent className="rounded-card border-line bg-card max-w-md gap-0 border p-0 shadow-xl sm:max-w-md">
          <DialogHeader className="border-line border-b p-6 pr-14 pb-4">
            <DialogTitle className="text-h3 text-foreground font-semibold">
              {editingUnit
                ? `Edit Room ${editingUnit.roomNumber}`
                : 'Add Room Unit'}
            </DialogTitle>
            <DialogDescription className="text-small text-muted-foreground">
              Configure room numbering and service availability.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUnit} className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Label htmlFor="unit-room-number">
                Room Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unit-room-number"
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 101, 204B"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-floor">Floor</Label>
              <Input
                id="unit-floor"
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 1st Floor, Ground Floor"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-status">Service Status</Label>
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
                value={status}
                onValueChange={(val) => {
                  if (val) handleStatusSelect(val as RoomStatus);
                }}
              >
                <SelectTrigger id="unit-status" className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-notes">Internal Notes</Label>
              <Textarea
                id="unit-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Adjoining door to 102, corner window"
              />
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
              if (editingUnit) setStatus(editingUnit.status);
            }
          }}
        >
          <DialogContent className="rounded-card border-destructive/40 bg-card max-w-lg gap-0 border p-0 shadow-2xl sm:max-w-lg">
            <DialogHeader className="border-line border-b p-6 pr-14 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="text-destructive size-6 shrink-0"
                  aria-hidden
                />
                <div>
                  <DialogTitle className="text-h3 text-foreground font-semibold">
                    Status Change Blocked by Active Bookings
                  </DialogTitle>
                  <DialogDescription className="text-small text-muted-foreground mt-1">
                    Cannot change status to{' '}
                    <strong>{pendingTargetStatus}</strong>. This room has active
                    or upcoming reservations that must be reassigned first.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="text-small p-6">
              {impactData.reservations.length > 0 && (
                <div className="border-line bg-paper mt-3 max-h-48 overflow-y-auto rounded border p-3 text-xs">
                  <p className="text-foreground font-semibold">
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
                          className="text-brand font-medium hover:underline"
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
                <div className="border-line bg-paper mt-3 rounded border p-3 text-xs">
                  <p className="text-foreground font-semibold">
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

              <DialogFooter className="border-line mt-5 border-t bg-transparent px-0 pb-0">
                <Button
                  type="button"
                  onClick={() => {
                    setImpactModalOpen(false);
                    if (editingUnit) setStatus(editingUnit.status);
                  }}
                >
                  Understood (Keep Active)
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
