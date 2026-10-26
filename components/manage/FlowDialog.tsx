'use client';

import type { ReactNode } from 'react';

import {
  Dialog,
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
        className="rounded-card border-line bg-paper text-ink flex max-h-[90dvh] w-[min(42rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border p-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-screen max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-[42rem]"
      >
        <DialogHeader className="border-line border-b px-5 py-3 pr-14 md:px-6">
          <DialogTitle className="font-display text-h3">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {title} dialog
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
