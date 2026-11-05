import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function StaleBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Alert
      variant="neutral"
      role="status"
      className="gap-3 text-muted-foreground sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="size-4 shrink-0 text-brand-ink"
          aria-hidden="true"
        />
        <span>Dashboard data may be stale due to a connection disruption.</span>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
        <RefreshCw aria-hidden="true" />
        <span>Refresh now</span>
      </Button>
    </Alert>
  );
}
