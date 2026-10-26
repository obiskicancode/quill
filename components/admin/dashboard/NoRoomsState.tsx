import { BedDouble, Plus } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { ButtonLink } from '@/components/ui/Button';

export function NoRoomsState() {
  return (
    <AdminCard>
      <div className="mx-auto max-w-md py-10 text-center">
        <span className="bg-paper mx-auto grid size-16 place-items-center rounded-full">
          <BedDouble className="text-muted size-8" aria-hidden="true" />
        </span>
        <h2 className="font-display text-h3 text-ink mt-4">
          No room types configured
        </h2>
        <p className="text-small text-muted mt-2">
          Your hotel property currently has no active room inventory. Configure
          your first room type and room numbers to start recording reservations
          and viewing occupancy metrics.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink
            href="/admin/rooms"
            variant="primary"
            size="md"
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            Add your first room type
          </ButtonLink>
        </div>
      </div>
    </AdminCard>
  );
}
