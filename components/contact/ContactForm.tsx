"use client";

import { ServiceError } from "@/app/api/services/base.service";
import { newKey } from "@/app/api/services/checkout.service";
import { contentService } from "@/app/api/services/content.service";
import {
  enquiryFormSchema,
  MAX_MESSAGE,
  normalizeTopic,
  STAY_TOPICS,
  topicLabels,
} from "@/schemas/content.schema";
import { CONTACT_TOPICS } from "@/types/content.types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Banner } from "../checkout/CheckoutStates";
import { Field, inputClass } from "../checkout/Field";
import { Reveal } from "../motion";
import { EASE_OUT } from "../motion/variants";
import { Button, ButtonLink } from "../ui/Button";

type FieldName =
  | "name"
  | "email"
  | "phone"
  | "topic"
  | "subject"
  | "message"
  | "checkIn"
  | "checkOut"
  | "guests"
  | "roomType"
  | "consent";
type Status = "idle" | "submitting" | "success" | "ratelimited" | "error";

interface ContactFormProps {
  initialTopic: string | null;
  /** A room slug from ?room=. */
  initialRoom: string | null;
  /** A booking reference from older links. It is put at the top of the message. */
  initialRef: string | null;
  rooms: { slug: string; name: string }[];
  responseHours: number;
  whatsappHref: string;
  /** Development preview of the server's answer: "ratelimit" or "error". */
  demo: string | null;
}

const labels: Record<FieldName, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  topic: "Topic",
  subject: "Subject",
  message: "Message",
  checkIn: "Check-in",
  checkOut: "Check-out",
  guests: "Guests",
  roomType: "Room type",
  consent: "Consent",
};
const ORDER: FieldName[] = [
  "name",
  "email",
  "phone",
  "topic",
  "subject",
  "checkIn",
  "checkOut",
  "guests",
  "roomType",
  "message",
  "consent",
];

/** A topic the contact form can actually show (the booking enquiry has its own page). */
function contactTopic(raw: string | null): string {
  const t = normalizeTopic(raw);
  return (CONTACT_TOPICS as string[]).includes(t) ? t : "general";
}

/** Contact form. Same Zod schema as the server. Input is never lost: errors, rate limits and server failures all keep it. */
export function ContactForm({
  initialTopic,
  initialRoom,
  initialRef,
  rooms,
  responseHours,
  whatsappHref,
  demo,
}: ContactFormProps) {
  const safeRef =
    initialRef && /^[A-Za-z0-9-]{4,30}$/.test(initialRef) ? initialRef : null;
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    topic: contactTopic(initialTopic),
    subject: "",
    message: safeRef ? `Booking reference: ${safeRef}\n\n` : "",
    checkIn: "",
    checkOut: "",
    guests: "",
    roomType: rooms.some((r) => r.slug === initialRoom)
      ? (initialRoom as string)
      : "",
    consent: false,
  });
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const [reference, setReference] = useState("");
  const [today, setToday] = useState("");
  const key = useRef(newKey());
  const submitting = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);

  const showStay = (STAY_TOPICS as string[]).includes(values.topic);
  const parse = (v: typeof values) => {
    const r = enquiryFormSchema.safeParse(v);
    const out: Partial<Record<FieldName, string>> = {};
    if (!r.success)
      for (const i of r.error.issues) out[i.path[0] as FieldName] ??= i.message;
    return out;
  };

  const set = (name: FieldName, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const blur = (name: FieldName) =>
    setErrors((e) => ({ ...e, [name]: parse(values)[name] }));
  const bind = (name: Exclude<FieldName, "consent">) => ({
    name,
    value: values[name],
    disabled: status === "submitting",
    onChange: (e: { target: { value: string } }) => set(name, e.target.value),
    onBlur: () => blur(name),
  });

  async function submit() {
    if (submitting.current) return;
    const found = parse(values);
    // Stay fields only matter for group and event topics.
    if (!showStay)
      for (const f of ["checkIn", "checkOut", "guests", "roomType"] as const)
        delete found[f];
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    submitting.current = true;
    setStatus("submitting");
    try {
      const { data } = await contentService.sendEnquiry({
        ...values,
        ...(showStay
          ? {}
          : { checkIn: "", checkOut: "", guests: "", roomType: "" }),
        idempotencyKey: key.current,
        website,
        demo,
      });
      setReference(data.reference);
      setStatus("success");
    } catch (e) {
      const err = e instanceof ServiceError ? e : null;
      if (err?.status === 422 && err.body?.fieldErrors) {
        setErrors(err.body.fieldErrors as Partial<Record<FieldName, string>>);
        setStatus("idle");
      } else if (err?.status === 429) {
        setServerMessage(
          err.body?.message ??
            "Please wait a few minutes before sending another message.",
        );
        setStatus("ratelimited");
      } else if (err?.network) {
        setServerMessage("We couldn't reach the server.");
        setStatus("error");
      } else {
        setServerMessage(
          err?.body?.message ??
            err?.message ??
            "We couldn't send your message.",
        );
        setStatus("error");
      }
    } finally {
      submitting.current = false;
    }
  }

  function reset() {
    key.current = newKey();
    setValues((v) => ({
      ...v,
      subject: "",
      message: "",
      checkIn: "",
      checkOut: "",
      guests: "",
      consent: false,
    }));
    setErrors({});
    setStatus("idle");
  }

  const summary = ORDER.filter((f) => errors[f]).map((f) => ({
    id: `contact-${f}`,
    message: `${labels[f]}: ${errors[f]}`,
  }));

  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      };

  const successPanel = (
    <div
      role="status"
      className="space-y-5 rounded-card border border-line bg-surface p-8 shadow-raised"
    >
      <CheckCircle2 className="size-10 text-accent-ink" aria-hidden />
      <h2 id="form-title" className="font-display text-h2">
        Thanks, we&rsquo;ll reply within {responseHours}{" "}
        {responseHours === 1 ? "hour" : "hours"}
      </h2>
      <p className="text-ink/85">
        Your message reference is{" "}
        <span className="font-semibold">{reference}</span>. We have emailed you
        a copy.
      </p>
      <p className="text-small text-ink/85">
        Need an answer sooner? Message us on WhatsApp.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink
          href={whatsappHref}
          external
          variant="whatsapp"
          icon={<MessageCircle className="size-5" aria-hidden />}
        >
          Chat on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
        <Button variant="secondary" onClick={reset}>
          Send another message
        </Button>
      </div>
    </div>
  );

  return (
    <section id="enquiry" aria-labelledby="form-title" className="section-y">
      <div className="container-page max-w-3xl">
        <AnimatePresence mode="wait" initial={false}>
          {status === "success" ? (
            <motion.div
              key="success"
              {...panelMotion}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              {successPanel}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              {...panelMotion}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <h2 id="form-title" className="font-display text-h2">
                Send us a message
              </h2>
              <p className="mt-3 text-body-lg text-ink/85">
                We reply within {responseHours}{" "}
                {responseHours === 1 ? "hour" : "hours"}.
              </p>

              <div className="mt-6 space-y-6" aria-live="polite">
                {status === "ratelimited" && (
                  <Banner role="alert" tone="warn" title="Please wait a little">
                    <p>{serverMessage} Your message is kept below.</p>
                  </Banner>
                )}
                {status === "error" && (
                  <Banner
                    role="alert"
                    tone="danger"
                    title="Your message was not sent"
                    actions={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void submit()}
                      >
                        Try again
                      </Button>
                    }
                  >
                    <p>
                      {serverMessage} Your message is kept below. Trying again
                      is safe: it will not send twice.
                    </p>
                  </Banner>
                )}
              </div>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="mt-8 space-y-5"
              >
                <Reveal className="grid gap-5 md:grid-cols-2">
                  <Field id="contact-name" label="Name" error={errors.name}>
                    {(a) => (
                      <input
                        {...a}
                        {...bind("name")}
                        type="text"
                        autoComplete="name"
                        className={inputClass(errors.name)}
                      />
                    )}
                  </Field>
                  <Field id="contact-email" label="Email" error={errors.email}>
                    {(a) => (
                      <input
                        {...a}
                        {...bind("email")}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={inputClass(errors.email)}
                      />
                    )}
                  </Field>
                </Reveal>
                <Reveal delay={0.05} className="grid gap-5 md:grid-cols-2">
                  <Field
                    id="contact-phone"
                    label="Phone"
                    optional
                    error={errors.phone}
                    hint="Add the country code if it is not a Nigerian number."
                  >
                    {(a) => (
                      <input
                        {...a}
                        {...bind("phone")}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className={inputClass(errors.phone)}
                      />
                    )}
                  </Field>
                  <Field
                    id="contact-topic"
                    label="What is this about?"
                    error={errors.topic}
                  >
                    {(a) => (
                      <select
                        {...a}
                        {...bind("topic")}
                        className={inputClass(errors.topic)}
                      >
                        {CONTACT_TOPICS.map((t) => (
                          <option key={t} value={t}>
                            {topicLabels[t]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </Reveal>
                <Field
                  id="contact-subject"
                  label="Subject"
                  optional
                  error={errors.subject}
                >
                  {(a) => (
                    <input
                      {...a}
                      {...bind("subject")}
                      type="text"
                      autoComplete="off"
                      className={inputClass(errors.subject)}
                    />
                  )}
                </Field>

                {showStay && (
                  <fieldset className="space-y-5 rounded-card border border-line bg-surface p-5">
                    <legend className="px-2 font-semibold">
                      Your stay (optional)
                    </legend>
                    <Reveal delay={0.1} className="grid gap-5 md:grid-cols-2">
                      <Field
                        id="contact-checkIn"
                        label="Check-in"
                        optional
                        error={errors.checkIn}
                      >
                        {(a) => (
                          <input
                            {...a}
                            {...bind("checkIn")}
                            type="date"
                            min={today || undefined}
                            className={inputClass(errors.checkIn)}
                          />
                        )}
                      </Field>
                      <Field
                        id="contact-checkOut"
                        label="Check-out"
                        optional
                        error={errors.checkOut}
                      >
                        {(a) => (
                          <input
                            {...a}
                            {...bind("checkOut")}
                            type="date"
                            min={values.checkIn || today || undefined}
                            className={inputClass(errors.checkOut)}
                          />
                        )}
                      </Field>
                      <Field
                        id="contact-guests"
                        label="Number of guests"
                        optional
                        error={errors.guests}
                      >
                        {(a) => (
                          <input
                            {...a}
                            {...bind("guests")}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            className={inputClass(errors.guests)}
                          />
                        )}
                      </Field>
                      <Field
                        id="contact-roomType"
                        label="Preferred room type"
                        optional
                        error={errors.roomType}
                      >
                        {(a) => (
                          <select
                            {...a}
                            {...bind("roomType")}
                            className={inputClass(errors.roomType)}
                          >
                            <option value="">No preference</option>
                            {rooms.map((r) => (
                              <option key={r.slug} value={r.slug}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    </Reveal>
                  </fieldset>
                )}

                <Field
                  id="contact-message"
                  label="Message"
                  error={errors.message}
                  hint={`${values.message.length.toLocaleString("en-NG")} / ${MAX_MESSAGE.toLocaleString("en-NG")} characters`}
                >
                  {(a) => (
                    <textarea
                      {...a}
                      {...bind("message")}
                      rows={6}
                      maxLength={MAX_MESSAGE + 200}
                      autoComplete="off"
                      className={`${inputClass(errors.message)} py-3`}
                    />
                  )}
                </Field>

                {/* Honeypot: hidden from people and assistive tech. Bots fill it in. */}
                <div
                  aria-hidden
                  className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                >
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 py-1">
                    <input
                      id="contact-consent"
                      type="checkbox"
                      checked={values.consent}
                      disabled={status === "submitting"}
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={
                        errors.consent ? "contact-consent-error" : undefined
                      }
                      onChange={(e) => set("consent", e.target.checked)}
                      className="mt-0.5 size-6 shrink-0 accent-ink"
                    />
                    <span className="text-small">
                      I agree to the{" "}
                      <Link
                        href="/policies/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
                      >
                        Privacy Policy
                        <span className="sr-only"> (opens in a new tab)</span>
                      </Link>{" "}
                      so the hotel can reply to me.
                    </span>
                  </label>
                  {errors.consent && (
                    <p
                      id="contact-consent-error"
                      className="mt-1.5 text-small font-medium text-danger"
                    >
                      {errors.consent}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={status === "submitting"}
                  disabled={status === "ratelimited"}
                >
                  {status === "submitting" ? "Sending" : "Send message"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
