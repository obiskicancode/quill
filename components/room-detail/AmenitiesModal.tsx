'use client';

import { useState, type ReactNode } from 'react';

import { roomAmenityLabels } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import type { RoomAmenityKey } from '@/types/rooms.types';

import { RoomAmenityIcon } from '../rooms/RoomAmenityIcon';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { textLinkClasses } from '../ui/text-link';

export function AmenitiesModal({
  total,
  groups,
  trigger,
}: {
  total: number;
  groups: { title: string; keys: RoomAmenityKey[] }[];
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger === undefined ? (
        <Button
          variant="secondary"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          Show all {total} amenities
        </Button>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className={cn(textLinkClasses, 'text-small')}
        >
          {trigger}
        </button>
      )}
      <DialogContent size="xl" surface="paper">
        <DialogHeader>
          <DialogTitle>Amenities</DialogTitle>
          <DialogDescription className="sr-only">
            Full list of amenities available with this room.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="font-semibold">{g.title}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.keys.map((k) => (
                  <li key={k} className="flex items-center gap-3 text-small">
                    <RoomAmenityIcon
                      name={k}
                      className="size-5 text-brand-ink"
                    />
                    {roomAmenityLabels[k]}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
