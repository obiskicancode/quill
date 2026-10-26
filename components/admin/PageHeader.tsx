import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-line flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-h2">{title}</h1>
        {description && (
          <p className="text-small text-muted-foreground mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
