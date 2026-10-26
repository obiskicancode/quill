'use client';

import { AlertCircle, X } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';

interface ActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  error?: string | null;
  onRefresh?: () => void;
}

export function ActionModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  error,
  onRefresh,
}: ActionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element
      setTimeout(() => {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }

        // Focus trap
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previousActiveElement.current?.focus();
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  const isStaleVersion = error?.includes('VERSION_CONFLICT');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      aria-describedby={description ? 'action-modal-desc' : undefined}
      className="animate-in fade-in bg-ink/50 fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-xs transition-opacity duration-200 sm:items-center sm:p-4"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Surface */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full ${maxWidthClass} border-line bg-paper sm:rounded-card flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-h-[85vh]`}
      >
        {/* Header */}
        <div className="border-line flex shrink-0 items-start justify-between border-b px-5 py-4">
          <div>
            <h2
              id="action-modal-title"
              className="font-display text-h3 text-ink font-semibold"
            >
              {title}
            </h2>
            {description && (
              <p
                id="action-modal-desc"
                className="text-small text-muted mt-0.5"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="hover:bg-canvas rounded-control text-muted hover:text-ink grid size-9 place-items-center transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Stale Version Alert */}
        {isStaleVersion && (
          <div className="rounded-control border-danger/40 bg-danger/10 text-small text-danger m-4 flex items-start gap-3 border p-3">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="font-semibold">Reservation updated elsewhere</p>
              <p className="text-caption mt-0.5">
                Another staff member modified this booking while you were
                reviewing. Please refresh to load the latest details.
              </p>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="rounded-control border-danger bg-paper text-caption text-danger hover:bg-danger/5 mt-2 inline-flex items-center border px-2.5 py-1 font-semibold"
                >
                  Refresh latest data
                </button>
              )}
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {error && !isStaleVersion && (
          <div
            role="alert"
            className="rounded-control border-danger/30 bg-danger/10 text-small text-danger mx-5 mt-4 flex items-start gap-2.5 border p-3"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
