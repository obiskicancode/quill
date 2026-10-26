import { cn } from 'cn';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';

type Tone = 'error' | 'success' | 'info';

const tones: Record<Tone, string> = {
  error: 'border-destructive/30 bg-destructive/5 text-destructive',
  success: 'border-success/30 bg-success/5 text-success',
  info: 'border-line bg-paper text-ink',
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
      className={cn(
        'rounded-control text-small items-start gap-2.5 border px-3.5 py-3',
        tones[tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="col-start-2">{children}</div>
    </Alert>
  );
}
