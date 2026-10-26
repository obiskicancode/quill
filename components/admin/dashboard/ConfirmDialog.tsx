'use client';

import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

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
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isConfirming) onCancel();
      }}
    >
      <AlertDialogContent className="rounded-card border-line bg-card shadow-float border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-h3">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-small">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/5 text-caption text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="col-start-2">{errorMessage}</span>
          </Alert>
        )}

        <AlertDialogFooter className="bg-transparent">
          <AlertDialogCancel
            variant="ghost"
            size="md"
            disabled={isConfirming}
            className="mt-0 sm:mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="primary"
            size="md"
            loading={isConfirming}
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
