'use client';

import type { ReactNode } from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FlowDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** false while a request is running: Esc and the close button are disabled so an action cannot be abandoned half-way. */
  dismissible?: boolean;
  children: ReactNode;
}

/**
 * Shared dialog shell for manage flows. It becomes non-dismissible while a
 * request is in flight so an action cannot be abandoned half-way.
 */
export function FlowDialog({
  open,
  onClose,
  title,
  dismissible = true,
  children,
}: FlowDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && dismissible) onClose();
      }}
    >
      <DialogContent
        showCloseButton={dismissible}
        size="2xl"
        surface="paper"
        className="max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-screen max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:pb-safe max-md:[--pb-safe-min:1.5rem]"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {title} dialog
          </DialogDescription>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
