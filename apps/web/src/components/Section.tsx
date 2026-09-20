import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** anchor target, so in-page links and `scroll-mt` work */
  id?: string;
  /** small glyph in the header gutter */
  icon?: ReactNode;
  /** hairline under the header; on by default, suppressed when `boxed` */
  divider?: boolean;
  /** heading element — 2 for a page movement, 3 for a block inside one. Semantics, not size. */
  level?: 2 | 3;
  /** type step, when the right heading element is louder than the surface wants. Defaults to `level`. */
  size?: 2 | 3;
  /** wrap the body in a panel. Reach for it only when the content is an object, not a list. */
  boxed?: boolean;
}

/**
 * A section is a header and a rule, not a card. The title carries the weight,
 * the rule sets the column, and the body inherits the page surface — so a page
 * of sections reads as one document instead of a stack of boxes. `boxed` opts
 * into a panel for the rare block that genuinely is a discrete object.
 */
export const Section = ({
  title,
  sub,
  right,
  children,
  className = "",
  bodyClassName = "",
  id,
  icon,
  divider = true,
  level = 2,
  size,
  boxed = false,
}: Props) => {
  const Heading = level === 3 ? "h3" : "h2";
  const step = size ?? level;
  const rule = divider && !boxed;
  return (
    <section className={className} id={id}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 ${
          rule ? "mb-3.5 border-b border-line pb-2" : "mb-3"
        }`}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          {icon && (
            <span className="shrink-0 self-center text-fg-2" aria-hidden>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <Heading className={step === 3 ? "h3" : "h2"}>{title}</Heading>
            {sub && <p className="small mt-1 text-fg-2">{sub}</p>}
          </div>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2 self-center">{right}</div>}
      </div>
      <div className={boxed ? `panel overflow-hidden ${bodyClassName}` : bodyClassName}>{children}</div>
    </section>
  );
};
