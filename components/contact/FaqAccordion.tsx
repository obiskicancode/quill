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
      className="divide-line border-line divide-y border-y"
    >
      {faqs.map((f) => (
        <AccordionItem key={f.id} value={f.id} className="border-b-0">
          <AccordionTrigger className="text-body text-ink hover:text-ink/80 min-h-14 py-4 text-left font-semibold hover:no-underline">
            {f.question}
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-ink/85 pr-9 pb-5">{f.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
