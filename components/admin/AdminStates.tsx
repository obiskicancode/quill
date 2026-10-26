import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function AdminLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface text-small text-muted"
    >
      <Loader2
        className="size-6 animate-spin motion-reduce:animate-none"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}

export function AdminEmpty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-paper px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-md text-small text-muted">
          {children}
        </p>
      )}
    </div>
  );
}

export function AdminError({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/30 bg-danger/5 px-5 py-6 text-small text-danger"
    >
      <p>{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
