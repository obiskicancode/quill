import { cn } from 'cn';
import type { ReactNode } from 'react';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export function AdminLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <Card
      role="status"
      className="rounded-card border-line bg-card text-small text-muted-foreground min-h-40 items-center justify-center gap-3 border py-0 shadow-none ring-0"
    >
      <Spinner className="size-6" aria-hidden />
      <span>{label}</span>
    </Card>
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
    <Card className="rounded-card border-line bg-paper border border-dashed px-5 py-10 text-center shadow-none ring-0">
      <p className="font-semibold">{title}</p>
      {children && (
        <p className="text-small text-muted-foreground mx-auto mt-1 max-w-md">
          {children}
        </p>
      )}
    </Card>
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
    <Alert
      variant="destructive"
      className={cn(
        'rounded-card border-destructive/30 bg-destructive/5 text-small text-destructive border px-5 py-6',
      )}
    >
      <AlertTitle>{message}</AlertTitle>
      {action && <div className="col-start-2 mt-3">{action}</div>}
    </Alert>
  );
}
