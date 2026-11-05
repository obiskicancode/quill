import type { ReactNode } from 'react';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export function AdminLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <Card
      role="status"
      variant="flat"
      className="min-h-40 items-center justify-center gap-3 py-0 text-muted-foreground"
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
    <Card
      variant="flat"
      className="border-dashed bg-paper px-5 py-10 text-center"
    >
      <p className="font-semibold">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-md text-small text-muted-foreground">
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
    <Alert variant="destructive" size="panel" className="px-5 py-6">
      <AlertTitle>{message}</AlertTitle>
      {action && <div className="col-start-2 mt-3">{action}</div>}
    </Alert>
  );
}
