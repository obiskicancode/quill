'use client';

import { AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isConfirming,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        if (!isConfirming) onCancel();
      }}
      className="open:animate-sheet-rise rounded-card border-line bg-surface shadow-float backdrop:bg-ink/50 fixed inset-0 z-50 m-auto w-[min(28rem,90vw)] border p-0 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-6">
        <h3 className="font-display text-h3 text-ink">{title}</h3>
        <p className="text-small text-muted mt-2">{description}</p>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-control border-danger/30 bg-danger/5 text-caption text-danger mt-4 flex items-start gap-2.5 border p-3"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={isConfirming}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={isConfirming}
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
