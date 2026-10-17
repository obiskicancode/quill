import type { ReactNode } from "react";
import { Reveal } from "../motion/Reveal";
import { TextReveal } from "../motion/TextReveal";

interface SectionHeadingProps {
  id: string;
  title: string;
  intro?: string;
  action?: ReactNode;
}

/** Heading, optional one-line intro, and one optional action on the right. Wraps cleanly with long staff-written text. */
export function SectionHeading({ id, title, intro, action }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 md:mb-14">
      <div className="max-w-2xl">
        <TextReveal as="h2" id={id} text={title} className="font-display text-h2 text-balance" staggerChildren={0.035} />
        {intro && (
          <Reveal delay={0.12}>
            <p className="mt-3 text-body-lg opacity-80">{intro}</p>
          </Reveal>
        )}
      </div>
      {action && <Reveal delay={0.18}>{action}</Reveal>}
    </div>
  );
}
