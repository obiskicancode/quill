import type { ReactNode } from 'react';

export function AdminCard({
  title,
  description,
  children,
  footer,
  className = '',
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-surface shadow-raised ${className}`}
    >
      {(title || description) && (
        <div className="border-b border-line px-4 py-4 sm:px-5">
          {title && <h2 className="font-display text-h3">{title}</h2>}
          {description && (
            <p className="mt-1 text-small text-muted">{description}</p>
          )}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      {footer && (
        <div className="border-t border-line px-4 py-3 sm:px-5">{footer}</div>
      )}
    </section>
  );
}
