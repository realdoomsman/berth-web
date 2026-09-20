import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Fixed bubble width; the tail and the horizontal clamp are both derived from it. */
const WIDTH = 240;
/** Keep the bubble off the viewport edge, and off the marker itself. */
const MARGIN = 8;
const OFFSET = 6;

interface Pos {
  left: number;
  /** distance from the viewport edge the bubble grows away from */
  edge: number;
  /** true when there was no room above, so the bubble hangs below the marker */
  below: boolean;
  /** tail centre, relative to the bubble's left edge */
  tail: number;
}

/**
 * Accessible "what is this?" marker: hover, focus, or tap reveals the note.
 *
 * The bubble is portalled to `document.body` and positioned in viewport
 * coordinates rather than being absolutely positioned inside the marker. That
 * is not over-engineering: these markers sit next to table headers and metric
 * captions, and any ancestor with `truncate` or `overflow-hidden` — which is
 * most cells in a data-dense layout — silently clips an absolutely positioned
 * bubble to nothing. It flips below the marker when there is no room above.
 *
 * Visually it is a raised surface on a hard offset shadow with a two-step pixel
 * tail: a rotated square would be a diamond, and a stepped tail is what an
 * arrow looks like on a grid.
 */
export const InfoTip = ({ text, className = "" }: { text: string; className?: string }) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const marker = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const b = marker.current?.getBoundingClientRect();
      if (!b) return;
      const centre = b.left + b.width / 2;
      const left = Math.round(Math.min(Math.max(MARGIN, centre - WIDTH / 2), window.innerWidth - WIDTH - MARGIN));
      /* Two lines of 12px type plus padding is ~64px; below that, hang down. */
      const below = b.top < 72 + OFFSET;
      setPos({
        left,
        edge: Math.round(below ? b.bottom + OFFSET : window.innerHeight - b.top + OFFSET),
        below,
        tail: Math.round(centre - left),
      });
    };
    place();
    /* Capture phase, so a scrolling panel moves the bubble too, not just the page. */
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        ref={marker}
        type="button"
        aria-label={text}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className={`num inline-flex size-4 items-center justify-center border text-[9.5px] leading-none transition-colors ${
          open ? "border-fg-3 bg-bg-3 text-fg" : "border-line-2 text-fg-2 hover:border-fg-3 hover:text-fg"
        }`}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open &&
        pos &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="panel-raised animate-rise pointer-events-none fixed z-50 p-2.5 text-left text-xs leading-relaxed font-normal tracking-normal normal-case text-fg-2 shadow-lift"
            style={{ left: pos.left, width: WIDTH, [pos.below ? "top" : "bottom"]: pos.edge }}
          >
            {text}
            <span
              className={`absolute flex ${pos.below ? "flex-col-reverse" : "flex-col"} items-center`}
              style={{ left: pos.tail - 4, [pos.below ? "bottom" : "top"]: "100%" }}
              aria-hidden
            >
              <span className="h-[2px] w-2 bg-line-2" />
              <span className="h-[2px] w-1 bg-line-2" />
            </span>
          </span>,
          document.body,
        )}
    </span>
  );
};
