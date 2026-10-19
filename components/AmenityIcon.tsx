import {
  Briefcase,
  CarFront,
  Coffee,
  Laptop,
  PlaneLanding,
  Presentation,
  ShieldCheck,
  Shirt,
  Snowflake,
  Tv,
  Utensils,
  UtensilsCrossed,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { AmenityKey } from '@/types/site.types';

const icons: Record<AmenityKey, LucideIcon> = {
  wifi: Wifi,
  parking: CarFront,
  restaurant: UtensilsCrossed,
  pool: Waves,
  power: Zap,
  security: ShieldCheck,
  conference: Presentation,
  airport: PlaneLanding,
  ac: Snowflake,
  tv: Tv,
  kitchen: Utensils,
  breakfast: Coffee,
  laundry: Shirt,
  workdesk: Laptop,
};

/** Decorative: the label is always shown next to it. Falls back to a neutral icon for unknown keys. */
export function AmenityIcon({
  name,
  className = 'size-5',
}: {
  name: AmenityKey;
  className?: string;
}) {
  const Icon = icons[name] ?? Briefcase;
  return <Icon className={className} aria-hidden />;
}
