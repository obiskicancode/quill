'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Faq } from '@/types/content.types';

export function FaqAccordion({
  faqs,
  mode = 'single',
}: {
  faqs: Faq[];
  mode?: 'single' | 'multi';
}) {
  return (
    <Accordion
      multiple={mode === 'multi'}
      className="divide-y divide-line border-y border-line"
    >
      {faqs.map((f) => (
        <AccordionItem key={f.id} value={f.id} className="border-b-0">
          <AccordionTrigger className="min-h-14 py-4 text-left text-body font-semibold text-ink hover:text-ink/80 hover:no-underline">
            {f.question}
          </AccordionTrigger>
          <AccordionContent>
            <p className="pr-9 pb-5 text-ink/85">{f.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
