'use client';

import { Printer } from 'lucide-react';

import { Button } from '../ui/Button';

export function PrintReceiptButton() {
  return (
    <Button
      size="lg"
      icon={<Printer className="size-5" aria-hidden />}
      onClick={() => window.print()}
    >
      Print or save as PDF
    </Button>
  );
}
