import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';

type Tone = 'error' | 'success' | 'info';

const toneVariant: Record<Tone, 'destructive' | 'success' | 'neutral'> = {
  error: 'destructive',
  success: 'success',
  info: 'neutral',
};

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function StatusBanner({
  tone = 'info',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const Icon = icons[tone];
  return (
    <Alert
      role={tone === 'error' ? 'alert' : 'status'}
      variant={toneVariant[tone]}
      className="items-start gap-2.5 px-3.5 py-3"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="col-start-2">{children}</div>
    </Alert>
  );
}
