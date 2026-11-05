import { BedDouble, Plus } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { ButtonLink } from '@/components/ui/button';

export function NoRoomsState() {
  return (
    <AdminCard>
      <div className="mx-auto max-w-md py-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-paper">
          <BedDouble
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
        <h2 className="mt-4 font-display text-h3 text-ink">
          No room types configured
        </h2>
        <p className="mt-2 text-small text-muted-foreground">
          Your hotel property currently has no active room inventory. Configure
          your first room type and room numbers to start recording reservations
          and viewing occupancy metrics.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink
            href="/admin/rooms"
            variant="primary"
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            Add your first room type
          </ButtonLink>
        </div>
      </div>
    </AdminCard>
  );
}
