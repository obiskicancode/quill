import { TextLink } from '@/components/ui/text-link';
import { headingIdMap, safeHref } from '@/lib/content/rich';
import type { RichBlock, RichLink } from '@/types/content.types';

function InlineLink({ link }: { link: RichLink }) {
  if (!safeHref(link.href)) return <span>{link.label}</span>;
  const external = /^https?:\/\//i.test(link.href);
  if (!external) {
    return <TextLink href={link.href}>{link.label}</TextLink>;
  }
  return (
    <TextLink href={link.href} external>
      {link.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </TextLink>
  );
}

/**
 * Renders the admin's rich text as plain, accessible elements (paragraphs, headings, lists, tables).
 * Longer or shorter text both fit. Heading ids are shared with the table of contents.
 */
export function RichText({ blocks }: { blocks: RichBlock[] }) {
  const ids = headingIdMap(blocks);
  return (
    <div className="space-y-4 text-body leading-prose text-ink/90">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h2':
            return (
              <h2
                key={i}
                id={ids.get(i)}
                className="scroll-mt-28 pt-6 font-display text-h2 text-ink"
              >
                {b.text}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={i}
                id={ids.get(i)}
                className="scroll-mt-28 pt-4 font-display text-h3 text-ink"
              >
                {b.text}
              </h3>
            );
          case 'ul':
          case 'ol': {
            const items = b.items;
            const List = b.type === 'ul' ? 'ul' : 'ol';
            return (
              <List
                key={i}
                className={`space-y-1 pl-6 ${b.type === 'ul' ? 'list-disc' : 'list-decimal'}`}
              >
                {items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </List>
            );
          }
          case 'table':
            return (
              <div
                key={i}
                className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
              >
                <table className="w-full border-collapse text-small">
                  {b.caption && (
                    <caption className="mb-2 text-left font-semibold text-ink">
                      {b.caption}
                    </caption>
                  )}
                  <thead>
                    <tr className="border-b border-line">
                      {b.head.map((h, j) => (
                        <th
                          key={j}
                          scope="col"
                          className="py-2 pr-4 text-left font-semibold text-ink"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr
                        key={j}
                        className="border-b border-line last:border-0"
                      >
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className="py-2 pr-4 align-top text-ink/85"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={i}>
                {b.text}
                {b.links?.map((l, j) => (
                  <span key={j}>
                    {' '}
                    <InlineLink link={l} />
                    {j < (b.links?.length ?? 0) - 1 ? ',' : '.'}
                  </span>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
