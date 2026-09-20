import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconX } from "./icons.js";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  /** sticky action row pinned to the bottom of the panel */
  footer?: ReactNode;
  /** one line of context under the title */
  sub?: ReactNode;
}

const WIDTH: Record<NonNullable<Props["width"]>, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Centred dialog on desktop, bottom sheet on mobile. Traps focus, locks scroll, Escape closes. */
export const Modal = ({ open, onClose, title, children, width = "md", footer, sub }: Props) => {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) {
        e.preventDefault();
        panel.current.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      returnTo?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Seated on a 4px offset block, the way a sprite stacks. There are no
          radius overrides left: every radius token in the theme is 0. */}
      <div
        ref={panel}
        tabIndex={-1}
        className={`panel-raised animate-rise flex max-h-[92dvh] w-full flex-col shadow-lift outline-none ${WIDTH[width]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="h2">
              {title}
            </h2>
            {sub && <p className="small mt-1 text-fg-2">{sub}</p>}
          </div>
          <button
            type="button"
            className="btn btn-ghost -mt-0.5 -mr-1.5 shrink-0 px-1.5 py-1.5 text-fg-2 hover:text-fg"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="body min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line bg-bg/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};
