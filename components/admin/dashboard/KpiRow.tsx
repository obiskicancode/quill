'use client';

import { ArrowDownLeft, ArrowUpRight, BedDouble, Users } from 'lucide-react';

import { StaggerGroup } from '@/components/motion/StaggerGroup';
import type { DashboardKpi } from '@/types/dashboard.types';

import { KpiCard } from './KpiCard';

export function KpiRow({ kpi }: { kpi: DashboardKpi }) {
  const occupancySubtitle = `${kpi.occupiedRooms} of ${kpi.sellableRooms} rooms`;
  const blockedNote =
    kpi.blockedRooms > 0
      ? `Rooms in maintenance or blocked are excluded from the occupancy denominator (${kpi.blockedRooms} blocked tonight).`
      : 'Rooms in maintenance or blocked are excluded from the occupancy denominator.';

  return (
    <section aria-label="Key Performance Indicators">
      <StaggerGroup className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard
          label="Arrivals today"
          value={kpi.arrivalsToday}
          subtitle="Scheduled check-ins"
          icon={<ArrowDownLeft className="text-success size-4" />}
          href="/admin/reservations?filter=arrivals_today"
          ariaLabel={`Arrivals today: ${kpi.arrivalsToday}, view filtered list`}
        />
        <KpiCard
          label="Departures today"
          value={kpi.departuresToday}
          subtitle="Scheduled check-outs"
          icon={<ArrowUpRight className="text-muted-foreground size-4" />}
          href="/admin/reservations?filter=departures_today"
          ariaLabel={`Departures today: ${kpi.departuresToday}, view filtered list`}
        />
        <KpiCard
          label="In-house tonight"
          value={kpi.inHouseTonight}
          subtitle="Staying over"
          icon={<Users className="text-brand-ink size-4" />}
          href="/admin/reservations?filter=in_house"
          ariaLabel={`In-house tonight: ${kpi.inHouseTonight}, view filtered list`}
        />
        <KpiCard
          label="Occupancy tonight"
          value={`${kpi.occupancyPercent}%`}
          subtitle={occupancySubtitle}
          tooltip={blockedNote}
          progressPercent={kpi.occupancyPercent}
          icon={<BedDouble className="text-primary size-4" />}
          href="/admin/reservations?filter=in_house"
          ariaLabel={`Occupancy tonight: ${kpi.occupancyPercent} percent, ${occupancySubtitle}. ${blockedNote} View filtered list`}
        />
      </StaggerGroup>
    </section>
  );
}
