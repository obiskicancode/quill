'use client';

import { useSite } from '@/providers/site.provider';

import { Magnetic } from '../motion/Magnetic';
import { Parallax } from '../motion/Parallax';
import { Reveal } from '../motion/Reveal';
import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';
import { TextReveal } from '../motion/TextReveal';
import { scaleIn } from '../motion/variants';
import { Photo } from '../ui/Photo';
import { TextLink } from '../ui/TextLink';

export function Intro() {
  const site = useSite();
  const { heading, body, image, learnMoreHref } = site.intro;
  if (!heading && body.length === 0 && !image.src) return null;
  return (
    <section aria-labelledby="intro-heading" className="section-y">
      <div className="container-page grid items-center gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <TextReveal
            as="h2"
            id="intro-heading"
            text={heading}
            className="font-display text-h2 max-w-xl text-balance"
          />
          <StaggerGroup
            className="text-body-lg text-ink/85 mt-6 max-w-xl space-y-4 leading-[1.7]"
            staggerChildren={0.1}
          >
            {body.map((paragraph) => (
              <StaggerItem as="p" key={paragraph}>
                {paragraph}
              </StaggerItem>
            ))}
          </StaggerGroup>
          <Reveal delay={0.2}>
            <div className="mt-4">
              <Magnetic className="inline-block">
                <TextLink href={learnMoreHref}>Learn more about us</TextLink>
              </Magnetic>
            </div>
          </Reveal>
        </div>
        <div className="md:col-span-5">
          <Parallax amount={8} className="md:ml-auto md:max-w-md">
            <Reveal variants={scaleIn}>
              <Photo
                src={image.src}
                alt={image.alt}
                sizes="(min-width: 768px) 40vw, 100vw"
                className="rounded-card aspect-[4/5] w-full"
              />
            </Reveal>
          </Parallax>
        </div>
      </div>
    </section>
  );
}
