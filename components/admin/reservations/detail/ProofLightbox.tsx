'use client';

import { Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuditProofView } from '@/hooks/services/admin/use-reservations-data';

interface ProofLightboxProps {
  open: boolean;
  reservationId: string;
  paymentId?: string;
  proofKey: string;
  proofMimeType?: string | null;
  onClose: () => void;
}

export function ProofLightbox({
  open,
  reservationId,
  paymentId,
  proofKey,
  proofMimeType,
  onClose,
}: ProofLightboxProps) {
  const auditProofView = useAuditProofView();
  const loggedViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      loggedViewRef.current = null;
      return;
    }

    const viewKey = `${reservationId}:${paymentId ?? ''}`;
    if (loggedViewRef.current === viewKey) return;
    loggedViewRef.current = viewKey;
    auditProofView.mutate({ reservationId, paymentId });
  }, [open, reservationId, paymentId, auditProofView]);

  const isPdf = proofMimeType?.includes('pdf') || proofKey.endsWith('.pdf');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="rounded-card border-line bg-card shadow-float max-h-[90vh] max-w-2xl gap-0 overflow-hidden border p-0 sm:max-w-2xl">
        <DialogHeader className="border-line border-b px-5 py-3.5 pr-14">
          <DialogTitle className="font-display text-h3 text-ink">
            Bank Transfer Proof
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview and download the uploaded bank transfer receipt.
          </DialogDescription>
        </DialogHeader>

        {/* Lightbox Content Area */}
        <div className="bg-paper flex max-h-[70vh] items-center justify-center overflow-auto p-4">
          {isPdf ? (
            <div className="py-12 text-center">
              <p className="text-ink font-semibold">PDF Payment Document</p>
              <p className="text-small text-muted-foreground mt-1">
                {proofKey}
              </p>
              <a
                href={`/api/admin/reservations/${reservationId}/proof`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-control bg-primary text-small text-primary-foreground hover:bg-brand-hover mt-4 inline-flex items-center gap-1.5 px-4 py-2 font-semibold"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                <span>Open PDF in new tab</span>
              </a>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/admin/reservations/${reservationId}/proof`}
              alt="Payment bank transfer receipt"
              className="rounded-control shadow-raised max-h-[65vh] w-auto object-contain"
            />
          )}
        </div>

        {/* Lightbox Footer */}
        <div className="border-line text-caption text-muted-foreground flex items-center justify-between border-t px-5 py-3">
          <span>Receipt key: {proofKey}</span>
          <a
            href={`/api/admin/reservations/${reservationId}/proof`}
            download
            className="text-ink inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>Download</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
