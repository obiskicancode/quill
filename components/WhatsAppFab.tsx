"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/lib/site";
import { spring } from "./motion/variants";

/** Floating WhatsApp button. On mobile it sits in the right-hand gap of the sticky Book Now bar. */
export function WhatsAppFab() {
  const reduced = useReducedMotion();

  return (
    <motion.a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      initial={reduced ? false : { opacity: 0, scale: 0.5 }}
      animate={reduced ? undefined : { opacity: 1, scale: 1 }}
      transition={{ ...spring, delay: 1.3 }}
      whileHover={reduced ? undefined : { scale: 1.07 }}
      whileTap={reduced ? undefined : { scale: 0.93 }}
      className="fixed bottom-3 right-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-float transition-[background-color] hover:bg-whatsapp-hover md:bottom-6 md:right-6"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {!reduced && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-whatsapp"
          initial={{ opacity: 0.35, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 3.4, ease: "easeOut", delay: 2 }}
        />
      )}
      <MessageCircle className="relative size-7" aria-hidden />
    </motion.a>
  );
}
