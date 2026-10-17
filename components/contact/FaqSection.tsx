import { getFaqs } from '@/lib/content/data'
import { faqJsonLd } from '@/lib/content/jsonld'
import type { PreviewFlags } from '@/lib/content/preview'
import { Reveal, TextReveal } from '@/components/motion'
import { JsonLd } from '../content/JsonLd'
import { FaqAccordion } from './FaqAccordion'

/** Published FAQs. Omitted when there are none, and the FAQPage data is only emitted when they are shown. */
export async function FaqSection({ flags }: { flags: PreviewFlags }) {
  const faqs = await getFaqs(flags)
  if (faqs.length === 0) return null
  const ld = faqJsonLd(faqs)
  return (
    <section aria-labelledby="faq-title" className="section-y">
      {ld && <JsonLd data={ld} />}
      <div className="container-page max-w-3xl">
        <TextReveal as="h2" id="faq-title" text="Common questions" className="mb-8 font-display text-h2" />
        <Reveal delay={0.12}>
          <FaqAccordion faqs={faqs} />
        </Reveal>
      </div>
    </section>
  )
}
