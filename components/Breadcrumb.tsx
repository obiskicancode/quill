import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

/** The last crumb is the current page and is not a link. */
export function Breadcrumb({
  items,
  tone = 'light',
}: {
  items: Crumb[];
  /** 'dark' for use on a dark hero image. */ tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <nav aria-label="Breadcrumb">
      <ol
        className={`flex flex-wrap items-center gap-x-2 text-small ${dark ? 'text-white/85' : 'text-muted-foreground'}`}
      >
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {last || !item.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={
                    last
                      ? dark
                        ? 'font-semibold text-white'
                        : 'font-semibold text-ink'
                      : ''
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={`inline-flex min-h-11 items-center underline-offset-4 hover:underline ${dark ? 'hover:text-white' : 'hover:text-ink'}`}
                >
                  {item.label}
                </Link>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
