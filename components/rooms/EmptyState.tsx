import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="rounded-card border-ink/30 border border-dashed px-6 py-12 text-center">
      <p className="font-display text-h3">{title}</p>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md">{text}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
