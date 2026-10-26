'use client';

import { Download, ExternalLink, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
        // Log audit view
        import('@/app/api/services/admin.service').then(({ adminService }) => {
          adminService.auditProofView(reservationId, paymentId).catch(() => {});
        });
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open, reservationId, paymentId]);

  if (!open) return null;

  const isPdf = proofMimeType?.includes('pdf') || proofKey.endsWith('.pdf');

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="open:animate-sheet-rise rounded-card border-line bg-surface shadow-float backdrop:bg-ink/75 fixed inset-0 z-50 m-auto max-h-[90vh] max-w-2xl overflow-hidden border p-0 backdrop:backdrop-blur-sm"
    >
      {/* Lightbox Header */}
      <div className="border-line flex items-center justify-between border-b px-5 py-3.5">
        <h3 className="font-display text-h3 text-ink">Bank Transfer Proof</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close proof preview"
          className="rounded-control text-muted hover:bg-paper hover:text-ink p-1 focus:outline-none"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Lightbox Content Area */}
      <div className="bg-paper flex max-h-[70vh] items-center justify-center overflow-auto p-4">
        {isPdf ? (
          <div className="py-12 text-center">
            <p className="text-ink font-semibold">PDF Payment Document</p>
            <p className="text-small text-muted mt-1">{proofKey}</p>
            <a
              href={`/api/admin/reservations/${reservationId}/proof`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-control bg-accent text-small text-ink hover:bg-accent-hover mt-4 inline-flex items-center gap-1.5 px-4 py-2 font-semibold"
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
      <div className="border-line text-caption text-muted flex items-center justify-between border-t px-5 py-3">
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
    </dialog>
  );
}
