import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';

import { StaggerGroup, StaggerItem, TextReveal } from '@/components/motion';
import { getSocialLinks } from '@/lib/content/data';
import type { PreviewFlags } from '@/lib/content/preview';
import type { SocialLink } from '@/types/content.types';

const icons: Record<SocialLink['platform'], LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  tiktok: Globe,
  other: Globe,
};

export async function SocialLinks({ flags }: { flags: PreviewFlags }) {
  const links = await getSocialLinks(flags);
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="social-title" className="pb-4">
      <div className="container-page">
        <TextReveal
          as="h2"
          id="social-title"
          text="Follow us"
          className="font-display text-h3"
        />
        <StaggerGroup
          as="ul"
          staggerChildren={0.05}
          className="mt-4 flex flex-wrap gap-3"
        >
          {links.map((l) => {
            const Icon = icons[l.platform] ?? Globe;
            return (
              <StaggerItem key={l.id} as="li" scale>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/50 bg-surface px-4 font-semibold transition-colors hover:bg-ink hover:text-paper"
                >
                  <Icon className="size-5" aria-hidden />
                  {l.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
