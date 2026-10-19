import type { ReactNode } from 'react';

interface HoverZoomProps {
  children: ReactNode;
  /** Size, ratio and rounding for the media box (e.g. "aspect-[4/3] rounded-card"). */
  className?: string;
  /** Caption revealed over a bottom gradient when the tile is hovered or focused. */
  caption?: ReactNode;
  /** Small affordance (for example an expand icon) revealed in the top-right on hover. */
  affordance?: ReactNode;
}

/**
 * Wraps a photo so it zooms slightly, with an optional caption and affordance that fade in.
 * The interactive ancestor (the `<button>` or `<a>`) must carry `group/media` so hover and
 * keyboard focus both drive the effect. Purely visual: adds no roles or handlers.
 * Motion is gated behind `motion-safe`, so reduced-motion users get a static image.
 */
export function HoverZoom({
  children,
  className = '',
  caption,
  affordance,
}: HoverZoomProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="h-full w-full transition-transform duration-700 ease-out motion-safe:group-focus-within/media:scale-105 motion-safe:group-hover/media:scale-105 motion-reduce:transition-none">
        {children}
      </div>
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end bg-gradient-to-t from-ink/85 via-ink/35 to-transparent p-4 pt-12 opacity-0 transition-opacity duration-300 group-focus-within/media:opacity-100 group-hover/media:opacity-100">
          <span className="line-clamp-2 text-small font-medium text-white">
            {caption}
          </span>
        </div>
      )}
      {affordance && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 text-white opacity-0 transition-opacity duration-300 group-focus-within/media:opacity-100 group-hover/media:opacity-100">
          {affordance}
        </div>
      )}
    </div>
  );
}
