'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useSaveDetails } from '@/hooks/services/guest/use-manage';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import { detailsPatchSchema } from '@/schemas/checkout.schema';
import type { GuestReservation } from '@/types/booking.types';

import { VerifyForm } from '../booking/VerifyForm';
import { Banner } from '../checkout/CheckoutStates';
import { DetailsStep, type GuestField } from '../checkout/DetailsStep';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';

interface EditDetailsPanelProps {
  v: GuestReservation;
  csrf: string;
  onSaved: (next: GuestReservation) => void;
  onClose: () => void;
  sessionExpired: boolean;
  onSessionExpired: () => void;
  onReverified: () => void;
}

/** Edit name, phone, country, arrival time and special requests. Same validation as checkout. Email is read-only. */
export function EditDetailsPanel({
  v,
  csrf,
  onSaved,
  onClose,
  sessionExpired,
  onSessionExpired,
  onReverified,
}: EditDetailsPanelProps) {
  const site = useSite();
  const m = v.manage!;
  const saveDetails = useSaveDetails();
  type DetailsInput = z.input<typeof detailsPatchSchema>;
  type DetailsOutput = z.output<typeof detailsPatchSchema>;
  const form = useForm<DetailsInput, unknown, DetailsOutput>({
    resolver: zodResolver(detailsPatchSchema),
    defaultValues: m.editable,
    mode: 'onBlur',
  });
  const {
    formState: { errors: formErrors, isDirty, isSubmitting },
    reset,
    setError: setFieldError,
    setValue,
    trigger,
    watch,
  } = form;
  const values = watch();
  const [error, setError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const key = useRef(newKey());
  const reduced = useReducedMotion();
  const busy = isSubmitting || saveDetails.isPending;
  const dirty = isDirty;
  const detailsErrors = Object.fromEntries(
    Object.entries(formErrors).map(([field, issue]) => [field, issue?.message]),
  ) as Partial<Record<GuestField, string>>;
  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2, ease: EASE_OUT },
      };

  const save = async (details: DetailsOutput) => {
    if (busy || !dirty) return;
    setError(null);
    setJustSaved(false);
    try {
      const next = await saveDetails.mutateAsync({
        reference: v.reference,
        body: { idempotencyKey: key.current, details },
        csrf,
      });
      reset(details);
      key.current = newKey();
      setJustSaved(true);
      onSaved(next);
    } catch (e) {
      const failure = e instanceof ServiceError ? e : null;
      if (failure?.body?.code === ERROR_CODES.SESSION_EXPIRED)
        onSessionExpired();
      else if (
        failure?.body?.code === ERROR_CODES.VALIDATION &&
        failure.body.fieldErrors
      ) {
        for (const [field, message] of Object.entries(
          failure.body.fieldErrors,
        )) {
          const name = field.startsWith('details.')
            ? field.slice('details.'.length)
            : field;
          setFieldError(name as keyof DetailsInput, {
            type: 'server',
            message,
          });
        }
        key.current = newKey();
      } else if (!failure || failure.network || failure.status >= 500)
        setError({
          message: ERROR_MESSAGES.COULD_NOT_REACH_SERVER_SAVE_UNKNOWN,
          retryable: true,
        });
      else {
        key.current = newKey();
        setError({
          message:
            failure.body?.message ?? ERROR_MESSAGES.COULD_NOT_SAVE_CHANGES,
          retryable: false,
        });
      }
    }
  };

  if (sessionExpired) {
    return (
      <section className="rounded-card border-line bg-card shadow-raised border p-5 md:p-6 print:hidden">
        <VerifyForm
          embedded
          scope="manage"
          variant="verify"
          reference={v.reference}
          notice={ERROR_MESSAGES.SESSION_ENDED_VERIFY_SAVE}
          onVerified={onReverified}
        />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="edit-title"
      className="rounded-card border-line bg-card shadow-raised border p-5 md:p-6 print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="edit-title" className="font-display text-h3">
          Edit details
        </h2>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>
          Close
        </Button>
      </div>

      <form
        noValidate
        onSubmit={form.handleSubmit(save)}
        className="mt-5 space-y-6"
      >
        <DetailsStep
          mode="edit"
          reference={v.reference}
          values={{ ...values, email: m.contact.email }}
          errors={detailsErrors}
          disabled={busy}
          onChange={(name, val) => {
            if (name === 'email') return;
            setValue(name, val, {
              shouldDirty: true,
              shouldValidate:
                form.formState.isSubmitted || Boolean(formErrors[name]),
            });
            setJustSaved(false);
          }}
          onBlur={(name) => {
            if (name !== 'email') void trigger(name);
          }}
        />

        {Object.values(detailsErrors).some(Boolean) && (
          <p role="alert" className="text-small text-destructive font-medium">
            Please fix the highlighted fields.
          </p>
        )}
        <AnimatePresence initial={false}>
          {error && (
            <motion.div {...panelMotion}>
              <Banner
                role="alert"
                tone="danger"
                title={ERROR_MESSAGES.CHANGES_NOT_SAVED}
                actions={
                  error.retryable ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={busy}
                      onClick={() => void form.handleSubmit(save)()}
                    >
                      Try again
                    </Button>
                  ) : undefined
                }
              >
                <p>{error.message}</p>
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>
        <p
          role="status"
          aria-live="polite"
          className={
            justSaved
              ? 'rounded-control bg-paper text-small p-3 font-semibold'
              : 'sr-only'
          }
        >
          <AnimatePresence initial={false}>
            {justSaved && (
              <motion.span key="saved" {...panelMotion}>
                Details saved. We emailed you a summary.
              </motion.span>
            )}
          </AnimatePresence>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" loading={busy} disabled={!dirty}>
            Save changes
          </Button>
          <span className="text-small text-muted-foreground">
            {dirty ? 'You have unsaved changes.' : 'No changes yet.'}
          </span>
        </div>
      </form>

      <div className="border-line text-small mt-6 border-t pt-4">
        <p className="font-semibold">Need to change something else?</p>
        <p className="text-ink/85 mt-1">
          The number of guests, the room type and prices can&rsquo;t be changed
          here.
        </p>
        <div className="mt-3">
          <ButtonLink
            href={whatsappHref(
              site,
              `Hello, I need to change the guests, room or price on booking ${v.reference}.`,
            )}
            external
            variant="secondary"
            size="sm"
          >
            Message the hotel
            <span className="sr-only"> (opens in a new tab)</span>
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
