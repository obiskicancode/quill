'use client';

import Image from 'next/image';
import { Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

/** Lightbox for viewing a transfer proof with audit logging. */
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
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>Bank Transfer Proof</DialogTitle>
          <DialogDescription className="sr-only">
            Preview and download the uploaded bank transfer receipt.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex items-center justify-center bg-paper">
          {isPdf ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-ink">PDF Payment Document</p>
              <p className="mt-1 text-small text-muted-foreground">
                {proofKey}
              </p>
              <a
                href={`/api/admin/reservations/${reservationId}/proof`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-small font-semibold text-primary-foreground hover:bg-brand-hover"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                <span>Open PDF in new tab</span>
              </a>
            </div>
          ) : (
            <Image
              src={`/api/admin/reservations/${reservationId}/proof`}
              alt="Payment bank transfer receipt"
              className="max-h-[65vh] w-auto rounded-control object-contain shadow-raised"
            />
          )}
        </DialogBody>

        <DialogFooter className="flex-row items-center justify-between py-3 text-caption text-muted-foreground sm:justify-between">
          <span>Receipt key: {proofKey}</span>
          <a
            href={`/api/admin/reservations/${reservationId}/proof`}
            download
            className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>Download</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
