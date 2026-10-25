import Image from 'next/image';
import Link from 'next/link';

import type { SiteConfig } from '@/types/site.types';

/** Logo for the public app, using the database-backed site config. */
export function SiteLogo({
  site,
  className = '',
}: {
  site: SiteConfig;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${site.name}, home`}
      className={`inline-flex min-h-11 items-center ${className}`}
    >
      {site.logo ? (
        <Image
          src={site.logo.src}
          alt=""
          width={site.logo.width}
          height={site.logo.height}
          priority
          className="h-9 w-auto md:h-10"
        />
      ) : (
        <span className="max-w-[9.5rem] font-display text-lg leading-[1.1] md:max-w-none md:text-xl">
          {site.shortName}
        </span>
      )}
    </Link>
  );
}
