import type { PolicyHeading, RichBlock } from '@/types/content.types';

/** A stable id for a heading, so table-of-contents anchors link to it. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/**
 * Assigns an id to each h2/h3 block, in document order, de-duplicating repeats so two
 * sections with the same heading still get distinct anchors. Used by both the renderer
 * and the table of contents so they always agree.
 */
export function headingIdMap(blocks: RichBlock[]): Map<number, string> {
  const ids = new Map<number, string>();
  const seen = new Set<string>();
  blocks.forEach((b, i) => {
    if (b.type !== 'h2' && b.type !== 'h3') return;
    const base = headingId(b.text);
    if (!base) return;
    let id = base;
    let n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.add(id);
    ids.set(i, id);
  });
  return ids;
}

/** The h2 and h3 headings in a body, in order, for the table of contents. */
export function policyHeadings(blocks: RichBlock[]): PolicyHeading[] {
  const ids = headingIdMap(blocks);
  const out: PolicyHeading[] = [];
  blocks.forEach((b, i) => {
    if (b.type !== 'h2' && b.type !== 'h3') return;
    const id = ids.get(i);
    if (id) out.push({ id, text: b.text, level: b.type === 'h2' ? 2 : 3 });
  });
  return out;
}

/**
 * True when the link is safe to render as an anchor. Admin text is trusted, but a stray
 * href (javascript:, or a protocol-relative //evil.com) is rendered as plain text instead.
 */
export function safeHref(href: string): boolean {
  return (
    /^\/(?!\/)/.test(href) ||
    /^https?:\/\//i.test(href) ||
    /^mailto:/i.test(href) ||
    /^tel:/i.test(href)
  );
}
