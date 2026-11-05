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
import { Chip } from '@/components/ui/chip';
import { getSocialLinks } from '@/lib/content/data';
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

export async function SocialLinks() {
  const links = await getSocialLinks();
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
                <Chip href={l.url} target="_blank" rel="noopener noreferrer">
                  <Icon className="size-5" aria-hidden />
                  {l.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </Chip>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
