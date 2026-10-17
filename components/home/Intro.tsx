import { site } from "@/lib/site";
import { Photo } from "../ui/Photo";
import { TextLink } from "../ui/TextLink";

export function Intro() {
  const { heading, body, image, learnMoreHref } = site.intro;
  return (
    <section aria-labelledby="intro-heading" className="section-y">
      <div className="container-page grid items-center gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <h2
            id="intro-heading"
            className="max-w-xl font-display text-h2 text-balance"
          >
            {heading}
          </h2>
          <div className="mt-6 max-w-xl space-y-4 text-body-lg leading-[1.7] text-ink/85">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-4">
            <TextLink href={learnMoreHref}>Learn more about us</TextLink>
          </div>
        </div>
        <div className="md:col-span-5">
          <Photo
            src={image.src}
            alt={image.alt}
            sizes="(min-width: 768px) 40vw, 100vw"
            className="aspect-[4/5] w-full rounded-card md:max-w-md md:ml-auto"
          />
        </div>
      </div>
    </section>
  );
}
