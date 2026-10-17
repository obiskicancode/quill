import { MessageCircle } from 'lucide-react'
import { whatsappHref } from '@/lib/site'

/** Floating WhatsApp button. On mobile it sits in the right-hand gap of the sticky Book Now bar. */
export function WhatsAppFab() {
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      className="fixed bottom-3 right-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-float transition-[background-color,transform] hover:bg-whatsapp-hover active:scale-95 md:bottom-6 md:right-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <MessageCircle className="size-7" aria-hidden />
    </a>
  )
}
