'use client';

import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

const maxWidthClass = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
} as const;

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
  const isStaleVersion = error?.includes('VERSION_CONFLICT');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={`border-line bg-paper shadow-float sm:rounded-card flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden rounded-t-2xl border p-0 sm:max-h-[85vh] ${maxWidthClass[maxWidth]}`}
      >
        <DialogHeader className="border-line shrink-0 border-b px-5 py-4 pr-14">
          <DialogTitle className="font-display text-h3 text-ink font-semibold">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-small text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {isStaleVersion && (
          <Alert
            variant="destructive"
            className="border-destructive/40 bg-destructive/10 text-small text-destructive mx-5 mt-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <AlertTitle>Reservation updated elsewhere</AlertTitle>
            <div className="col-start-2 mt-1">
              Another staff member modified this booking while you were
              reviewing. Please refresh to load the latest details.
              {onRefresh && (
                <Button
                  type="button"
                  variant="outline"
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
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/10 text-small text-destructive mx-5 mt-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="col-start-2">{error}</span>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
