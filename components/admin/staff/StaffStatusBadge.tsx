import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type { StaffStatus } from '@/types/staff.types';

const statusVariant: Record<StaffStatus, BadgeVariant> = {
  active: 'success',
  invited: 'brand',
  locked: 'destructive',
  deactivated: 'neutral',
};

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status}
    </Badge>
  );
}
