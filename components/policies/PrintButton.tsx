'use client';

import { Printer } from 'lucide-react';

import { Button } from '../ui/Button';

export function PrintButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Printer className="size-4" aria-hidden />}
      onClick={() => window.print()}
    >
      Print
    </Button>
  );
}
