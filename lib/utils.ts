import { createCn } from 'cn/config';

/**
 * The type ramp lives in app/globals.css as `@theme --text-*` scales, so
 * `text-small` and friends are font sizes here, not colours. The merge engine
 * only knows Tailwind's own scale names, so unconfigured it reads `text-small`
 * as a text colour and deletes whichever class it sits next to — a
 * `variant="danger"` button would lose `text-destructive-foreground` and render
 * dark text on a red fill. Every `--text-*` key in globals.css belongs in this
 * list; `pnpm ui:check` enforces that.
 */
const TYPE_RAMP = [
  'display',
  'h2',
  'h3',
  'figure',
  'figure-sm',
  'quote',
  'body-lg',
  'body',
  'small',
  'caption',
  'micro',
] as const;

const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: [...TYPE_RAMP] }],
    },
  },
});

export { cn };
