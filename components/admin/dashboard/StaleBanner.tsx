import { AlertTriangle, RefreshCw } from 'lucide-react';

export function StaleBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div
      role="status"
      className="rounded-control border-line bg-paper text-small text-muted flex items-center justify-between gap-3 border px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="size-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <span>Dashboard data may be stale due to a connection disruption.</span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-control text-ink inline-flex items-center gap-1.5 font-semibold hover:underline"
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        <span>Refresh now</span>
      </button>
    </div>
  );
}
