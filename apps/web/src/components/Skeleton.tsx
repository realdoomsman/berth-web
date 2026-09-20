/**
 * Dithered loading block. Size it with `className` (e.g. `h-4 w-24`). The
 * texture, the hard border and the square corners all come from the `skeleton`
 * utility, so "loading", "disabled" and "no data yet" are one idea.
 */
export const Skeleton = ({ className = "h-4 w-full" }: { className?: string }) => (
  <div className={`skeleton ${className}`} aria-hidden />
);

/**
 * Blinking block cursor: the theme's signature "working" gesture. Use it where
 * the machine is genuinely waiting for its next line — the tail of a live log,
 * a mutation in flight — and nowhere else, because a cursor on every pending
 * region is just noise. Sized in `em` so it matches whatever type it trails.
 */
export const Cursor = ({ className = "" }: { className?: string }) => (
  <span className={`animate-blink inline-block h-[1em] w-[0.5em] translate-y-[0.12em] bg-fg-3 ${className}`} aria-hidden />
);
