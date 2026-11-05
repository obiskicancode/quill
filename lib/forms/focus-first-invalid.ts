import type { FieldErrors } from 'react-hook-form';

/** Fields in the order they appear on screen. */
const FIELD_ORDER = [
  'name',
  'email',
  'phone',
  'topic',
  'subject',
  'checkIn',
  'checkOut',
  'guests',
  'adults',
  'children',
  'roomType',
  'message',
  'consent',
] as const;

/** Date errors sit on the picker, which has one DOM slot for both ends. */
const FIELD_SLOT: Partial<Record<(typeof FIELD_ORDER)[number], string>> = {
  checkIn: 'dates',
  checkOut: 'dates',
};

/**
 * Scrolls to and focuses the first field that failed validation.
 * `fieldId` maps a DOM slot name to the element id used on the page.
 */
export function focusFirstInvalid(
  fieldId: (slot: string) => string,
  errors: FieldErrors,
) {
  for (const field of FIELD_ORDER) {
    if (!errors[field]) continue;
    const slot = FIELD_SLOT[field] ?? field;
    // Validation fires before the error state paints, and a picker can
    // enable or disable its buttons the moment the error shows. Wait one
    // frame so the focus lands on what the guest will actually see.
    requestAnimationFrame(() => {
      const element = document.getElementById(fieldId(slot));
      if (!element) return;
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      element.scrollIntoView({
        block: 'center',
        behavior: reduced ? 'instant' : 'smooth',
      });
      const target = focusableInside(element);
      target?.focus({ preventScroll: true });
    });
    return;
  }
}

function focusableInside(element: HTMLElement): HTMLElement {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLButtonElement
  ) {
    return element;
  }
  // A container (the date picker, a guest stepper): focus the container
  // itself so a screen reader reads its label and error, and so the focus
  // cannot be orphaned by buttons the error state disables a moment later.
  element.tabIndex = -1;
  return element;
}
