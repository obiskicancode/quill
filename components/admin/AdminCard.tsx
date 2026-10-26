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
      className={`rounded-card border-line bg-surface shadow-raised border ${className}`}
    >
      {(title || description) && (
        <div className="border-line border-b px-4 py-4 sm:px-5">
          {title && <h2 className="font-display text-h3">{title}</h2>}
          {description && (
            <p className="text-small text-muted mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      {footer && (
        <div className="border-line border-t px-4 py-3 sm:px-5">{footer}</div>
      )}
    </section>
  );
}
