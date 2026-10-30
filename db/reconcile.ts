import { sql } from 'drizzle-orm';

import { db } from '@/db';

type Report = { name: string; rows: unknown[] };

async function runReport(name: string, query: ReturnType<typeof sql>) {
  const result = await db.execute(query);
  return { name, rows: result.rows } satisfies Report;
}

async function main() {
  const reports = await Promise.all([
    runReport(
      'paid_without_booking_outcome',
      sql`
        SELECT p.id, p.reference, p.amount_minor, p.provider,
               r.reference AS reservation_reference, r.status
        FROM payments p
        JOIN reservations r ON r.id = p.reservation_id
        WHERE p.status = 'paid'
          AND p.type <> 'refund'
          AND r.status IN ('pending', 'expired', 'cancelled')
        ORDER BY p.created_at DESC
      `,
    ),
    runReport(
      'expired_pending_holds',
      sql`
        SELECT id, reference, status, hold_expires_at, payment_mode
        FROM reservations
        WHERE status = 'pending'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at < now()
        ORDER BY hold_expires_at ASC
      `,
    ),
    runReport(
      'balance_minor_mismatches',
      sql`
        SELECT id, reference, total_minor, amount_paid_minor,
               amount_refunded_minor, balance_minor,
               GREATEST(0, total_minor - amount_paid_minor + amount_refunded_minor) AS expected
        FROM reservations
        WHERE balance_minor <> GREATEST(0, total_minor - amount_paid_minor + amount_refunded_minor)
        ORDER BY updated_at DESC
      `,
    ),
    runReport(
      'refund_ledger_mismatches',
      sql`
        SELECT r.id, r.reference, r.amount_refunded_minor,
               COALESCE(SUM(p.amount_minor) FILTER (WHERE p.type = 'refund' AND p.status = 'paid'), 0) AS paid_refunds
        FROM reservations r
        LEFT JOIN payments p ON p.reservation_id = r.id
        GROUP BY r.id
        HAVING r.amount_refunded_minor <> COALESCE(SUM(p.amount_minor) FILTER (WHERE p.type = 'refund' AND p.status = 'paid'), 0)
        ORDER BY r.updated_at DESC
      `,
    ),
    runReport(
      'missing_snapshots',
      sql`
        SELECT id, reference, booking_source, created_at
        FROM reservations
        WHERE snapshot IS NULL
        ORDER BY created_at DESC
      `,
    ),
  ]);

  for (const report of reports) {
    console.log(`\n## ${report.name} (${report.rows.length})`);
    if (report.rows.length > 0) console.table(report.rows);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
