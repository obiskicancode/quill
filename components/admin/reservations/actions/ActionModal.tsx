'use client';

import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ERROR_CODES } from '@/constants/error-codes';

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
  const isStaleVersion = error?.includes(ERROR_CODES.VERSION_CONFLICT);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent size={maxWidth} surface="paper">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isStaleVersion && (
          <Alert variant="destructive" className="mx-5 mt-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <AlertTitle>Reservation updated elsewhere</AlertTitle>
            <div className="col-start-2 mt-1">
              Another staff member modified this booking while you were
              reviewing. Please refresh to load the latest details.
              {onRefresh && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onRefresh}
                  className="mt-2"
                >
                  Refresh latest data
                </Button>
              )}
            </div>
          </Alert>
        )}

        {error && !isStaleVersion && (
          <Alert variant="destructive" className="mx-5 mt-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="col-start-2">{error}</span>
          </Alert>
        )}

        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
