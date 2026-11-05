'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AnimatedList } from '@/components/motion/AnimatedList';
import { Alert, AlertTitle } from '@/components/ui/alert';
import type { AttentionItem } from '@/types/dashboard.types';

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <section aria-label="Action items">
        <Alert variant="success" size="panel" className="items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <AlertTitle className="font-semibold">
            Nothing needs attention — operations are all clear!
          </AlertTitle>
        </Alert>
      </section>
    );
  }

  return (
    <section aria-label="Action items requiring attention">
      <AdminCard
        title="Needs attention"
        description="Prioritised operational items waiting on staff action."
        className="border-destructive/30"
      >
        <AnimatedList className="divide-y divide-line">
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
                className="group flex flex-col gap-2 rounded-control px-2 py-2 transition-colors hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-caption font-bold text-destructive">
                    {item.count}
                  </span>
                  <div>
                    <span className="font-semibold text-ink group-hover:text-brand-ink">
                      {item.label}
                    </span>
                    <span className="ml-2 text-caption text-muted-foreground">
                      (oldest {item.oldestAge})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end text-caption font-semibold text-muted-foreground group-hover:text-ink sm:self-auto">
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
