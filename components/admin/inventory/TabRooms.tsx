'use client';

import Link from 'next/link';
import { AlertCircle, Check, Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
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
      setErrorMessage('Room number is required');
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
        setSuccessMessage(`Room ${roomNumber} updated successfully`);
      } else {
        await adminService.createRoom({ ...input, roomTypeId });
        setSuccessMessage(`Room ${roomNumber} added successfully`);
      }
      setDialogOpen(false);
      await onRefresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save room unit',
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
      setSuccessMessage(`Room ${unit.roomNumber} deleted successfully`);
      await onRefresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete room',
      );
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-card border-danger/40 bg-danger/10 text-small text-danger flex items-center gap-3 border p-4"
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
          <p className="text-small text-muted">
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
        <div className="rounded-card border-line bg-paper text-muted border p-8 text-center">
          No room units assigned yet. Add physical rooms to enable booking
          assignments.
        </div>
      ) : (
        <div className="rounded-card border-line bg-surface overflow-x-auto border">
          <table className="text-small w-full text-left">
            <thead className="border-line bg-paper text-muted border-b">
              <tr>
                <th className="py-3 pr-3 pl-4 font-medium">Room Number</th>
                <th className="px-4 py-3 font-medium">Floor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  Next Reservation / Block
                </th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="py-3 pr-4 pl-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rooms.map((u) => (
                <tr key={u.id} className="hover:bg-paper/40 transition-colors">
                  <td className="text-foreground py-3 pr-3 pl-4 font-semibold">
                    {u.roomNumber}
                  </td>
                  <td className="text-muted px-4 py-3">{u.floor || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.status === 'active'
                          ? 'bg-success/15 text-success'
                          : u.status === 'maintenance'
                            ? 'bg-warning/15 text-warning-contrast'
                            : 'bg-muted/20 text-muted'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          u.status === 'active'
                            ? 'bg-success'
                            : u.status === 'maintenance'
                              ? 'bg-warning'
                              : 'bg-muted'
                        }`}
                      />
                      {u.status === 'active'
                        ? 'Active'
                        : u.status === 'maintenance'
                          ? 'Maintenance'
                          : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.nextReservation ? (
                      <div className="flex flex-col text-xs">
                        <Link
                          href={`/admin/reservations/${u.nextReservation.id}`}
                          className="text-brand font-medium hover:underline"
                        >
                          {u.nextReservation.reference} (
                          {u.nextReservation.guestName})
                        </Link>
                        <span className="text-muted">
                          {u.nextReservation.checkIn} to{' '}
                          {u.nextReservation.checkOut}
                        </span>
                      </div>
                    ) : u.nextBlock ? (
                      <div className="text-warning-contrast flex flex-col text-xs">
                        <span className="font-medium">
                          Blocked ({u.nextBlock.reason})
                        </span>
                        <span className="text-muted">
                          {u.nextBlock.startDate} to {u.nextBlock.endDate}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">None upcoming</span>
                    )}
                  </td>
                  <td className="text-muted max-w-xs truncate px-4 py-3 text-xs">
                    {u.notes || '—'}
                  </td>
                  <td className="py-3 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(u)}
                        aria-label={`Edit room ${u.roomNumber}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(u)}
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete room ${u.roomNumber}`}
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

      {/* Add / Edit Unit Modal Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="rounded-card border-line bg-surface w-full max-w-md border p-6 shadow-xl">
            <h3 className="text-foreground text-h3 font-semibold">
              {editingUnit
                ? `Edit Room ${editingUnit.roomNumber}`
                : 'Add Room Unit'}
            </h3>
            <p className="text-small text-muted mt-1">
              Configure room numbering and service availability.
            </p>

            <form onSubmit={handleSaveUnit} className="mt-4 space-y-4">
              <div>
                <label className="text-foreground text-small block font-medium">
                  Room Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101, 204B"
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-foreground text-small block font-medium">
                  Floor
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 1st Floor, Ground Floor"
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-foreground text-small block font-medium">
                  Service Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    handleStatusSelect(e.target.value as RoomStatus)
                  }
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                >
                  <option value="active">
                    Active (Available for guest bookings)
                  </option>
                  <option value="maintenance">
                    Maintenance (Out of order)
                  </option>
                  <option value="inactive">Inactive (Decommissioned)</option>
                </select>
              </div>

              <div>
                <label className="text-foreground text-small block font-medium">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Adjoining door to 102, corner window"
                  className="bg-background text-foreground focus:border-brand border-line mt-1 w-full rounded border px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                    : editingUnit
                      ? 'Save Changes'
                      : 'Add Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Impact Warning Modal */}
      {impactModalOpen && impactData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="rounded-card border-danger/40 bg-surface w-full max-w-lg border p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-danger size-6 shrink-0" />
              <div>
                <h3 className="text-foreground text-h3 font-semibold">
                  Status Change Blocked by Active Bookings
                </h3>
                <p className="text-small text-muted mt-1">
                  Cannot change status to <strong>{pendingTargetStatus}</strong>
                  . This room has active or upcoming reservations that must be
                  reassigned first.
                </p>

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
                            <strong>{r.reference}</strong> ({r.guestName})
                            &bull; {r.checkIn} to {r.checkOut}
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

                <div className="mt-5 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setImpactModalOpen(false);
                      // Revert status to existing unit status
                      if (editingUnit) setStatus(editingUnit.status);
                    }}
                  >
                    Understood (Keep Active)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
