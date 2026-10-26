'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  UserCheck,
  UserMinus,
  XCircle,
} from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import { AnimatedList } from '@/components/motion/AnimatedList';
import type { ActivityEvent, ActivityEventType } from '@/types/dashboard.types';

const iconMap: Record<ActivityEventType, typeof CalendarCheck> = {
  new_booking: CalendarCheck,
  payment_received: CreditCard,
  check_in: UserCheck,
  check_out: UserMinus,
  cancellation: XCircle,
  new_enquiry: MessageSquare,
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <section aria-label="Recent activity stream">
      <AdminCard
        title="Recent activity"
        description="The latest 10 operational events across bookings, payments and enquiries."
      >
        {events.length === 0 ? (
          <AdminEmpty title="No recent activity">
            Recent booking movements and enquiries will appear here as they
            occur.
          </AdminEmpty>
        ) : (
          <AnimatedList className="divide-line divide-y">
            {events.map((event) => {
              const Icon = iconMap[event.type] ?? CalendarCheck;
              return (
                <motion.li
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <Link
                    href={event.href}
                    className="group rounded-control hover:bg-paper flex items-center justify-between gap-3 px-2 py-1.5 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded-control bg-paper text-muted group-hover:bg-accent group-hover:text-ink grid size-8 shrink-0 place-items-center">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-small text-ink group-hover:text-accent-ink truncate font-medium">
                          {event.label}
                        </p>
                        <p className="text-caption text-muted">
                          {event.relativeTime}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      className="text-muted group-hover:text-ink size-4 shrink-0 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </motion.li>
              );
            })}
          </AnimatedList>
        )}
      </AdminCard>
    </section>
  );
}
