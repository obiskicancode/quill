'use client';

import { useState } from 'react';

import { roomAmenityLabels } from '@/lib/rooms';
import type { RoomAmenityKey } from '@/types/rooms.types';

import { RoomAmenityIcon } from '../rooms/RoomAmenityIcon';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function AmenitiesModal({
  total,
  groups,
}: {
  total: number;
  groups: { title: string; keys: RoomAmenityKey[] }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Show all {total} amenities
      </Button>
      <DialogContent className="rounded-card border-line bg-paper text-ink flex max-h-[85dvh] w-[min(36rem,calc(100vw-2rem))] flex-col gap-0 border p-0 sm:max-w-[36rem]">
        <DialogHeader className="border-line border-b px-6 py-3 pr-14">
          <DialogTitle className="font-display text-h3">Amenities</DialogTitle>
          <DialogDescription className="sr-only">
            Full list of amenities available with this room.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 overflow-y-auto px-6 py-6">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="font-semibold">{g.title}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.keys.map((k) => (
                  <li key={k} className="text-small flex items-center gap-3">
                    <RoomAmenityIcon
                      name={k}
                      className="text-brand-ink size-5"
                    />
                    {roomAmenityLabels[k]}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
