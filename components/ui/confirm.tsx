'use client';

import { AlertCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive asks say so on the button, not only in the sentence. */
  tone?: 'primary' | 'danger';
  /**
   * The work to do if the operator confirms. While it runs the dialog stays open
   * with the button in its loading state, and a thrown message is shown inside
   * the dialog so the operator can retry or back out without losing context —
   * which is the whole reason this exists instead of a native confirm().
   */
  run?: () => Promise<void>;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
    setError(null);
    setBusy(false);
  }, []);

  const ask = useCallback<Ask>(
    (next) =>
      new Promise<boolean>((resolve) => {
        // a second ask while one is open must not strand the first caller
        resolveRef.current?.(false);
        setError(null);
        setBusy(false);
        resolveRef.current = resolve;
        setOptions(next);
      }),
    [],
  );

  async function onConfirm() {
    if (!options) return;
    if (!options.run) {
      settle(true);
      return;
    }
    setBusy(true);
    try {
      await options.run();
      settle(true);
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : 'The action could not be run.',
      );
    }
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <AlertDialog
        open={options !== null}
        onOpenChange={(next) => {
          if (!next && !busy) settle(false);
        }}
      >
        <AlertDialogContent>
          {options && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{options.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {options.description}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {error && (
                <Alert variant="destructive" size="panel" role="alert">
                  <AlertCircle className="size-4 shrink-0" aria-hidden />
                  <AlertTitle>Could not complete</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <AlertDialogFooter className="bg-transparent">
                <AlertDialogCancel
                  variant="ghost"
                  disabled={busy}
                  className="mt-0 sm:mt-0"
                >
                  {options.cancelLabel ?? 'Cancel'}
                </AlertDialogCancel>
                <Button
                  variant={options.tone === 'danger' ? 'danger' : 'primary'}
                  loading={busy}
                  disabled={busy}
                  onClick={() => void onConfirm()}
                >
                  {options.confirmLabel ?? 'Confirm'}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Ask before an action that cannot be undone.
 *
 * Resolves true only when the operator confirms, and never on dismissal — the
 * native confirm() these replaced blocked the main thread, ignored the design
 * system, and returned true for a bare Enter on a destructive label.
 */
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>.');
  }
  return ask;
}
