'use client';

import { ShieldCheck } from 'lucide-react';

import { Alert, AlertTitle } from '@/components/ui/alert';

export function LogIntegrityBadge() {
  return (
    <Alert className="border-line bg-paper/60 text-caption text-muted-foreground px-3 py-2">
      <ShieldCheck className="text-success size-4 shrink-0" aria-hidden />
      <AlertTitle className="text-ink">Database Log Integrity</AlertTitle>
      <div className="col-start-2 mt-1">
        Audit log entries are immutable. PostgreSQL triggers and role privilege
        revocations enforce strict append-only retention. Modifications and
        deletions are permanently rejected at the database engine level.
      </div>
    </Alert>
  );
}
