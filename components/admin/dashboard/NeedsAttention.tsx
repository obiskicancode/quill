'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AnimatedList } from '@/components/motion/AnimatedList';
import type { AttentionItem } from '@/types/dashboard.types';

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <section aria-label="Action items">
        <div className="rounded-card border-success/30 bg-success/5 text-small text-success flex items-center gap-3 border p-4">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <span className="font-semibold">
            Nothing needs attention — operations are all clear!
          </span>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Action items requiring attention">
      <AdminCard
        title="Needs attention"
        description="Prioritised operational items waiting on staff action."
        className="border-danger/30"
      >
        <AnimatedList className="divide-line divide-y">
          {items.map((item) => (
            <motion.li
              key={item.type}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-3 first:pt-0 last:pb-0"
            >
              <Link
                href={item.href}
                className="group rounded-control hover:bg-paper flex flex-col gap-2 px-2 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-danger/10 text-caption text-danger inline-flex size-6 shrink-0 items-center justify-center rounded-full font-bold">
                    {item.count}
                  </span>
                  <div>
                    <span className="text-ink group-hover:text-accent-ink font-semibold">
                      {item.label}
                    </span>
                    <span className="text-caption text-muted ml-2">
                      (oldest {item.oldestAge})
                    </span>
                  </div>
                </div>

                <div className="text-caption text-muted group-hover:text-ink flex items-center gap-1.5 self-end font-semibold sm:self-auto">
                  <span>View</span>
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </motion.li>
          ))}
        </AnimatedList>
      </AdminCard>
    </section>
  );
}
