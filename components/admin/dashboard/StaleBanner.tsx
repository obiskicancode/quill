import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function StaleBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div
      role="status"
      className="rounded-control border-line bg-paper text-small text-muted-foreground flex items-center justify-between gap-3 border px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="text-brand-ink size-4 shrink-0"
          aria-hidden="true"
        />
        <span>Dashboard data may be stale due to a connection disruption.</span>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="size-3.5" aria-hidden="true" />
        <span>Refresh now</span>
      </Button>
    </div>
  );
}
