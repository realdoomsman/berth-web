import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconX } from "./icons.js";

export type ToastTone = "success" | "error" | "info";

export interface ToastSpec {
  title: string;
  body?: string;
  tone?: ToastTone;
  /** ms before auto-dismiss; 0 keeps it until dismissed. Defaults to 4000. */
  duration?: number;
}

interface ToastApi {
  toast: (t: ToastSpec) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
}

interface Live extends ToastSpec {
  id: number;
}

const noop: ToastApi = { toast: () => {}, success: () => {}, error: () => {} };
const Ctx = createContext<ToastApi>(noop);

/** Fire a toast from anywhere under `ToastProvider` (mounted in Shell). */
export const useToast = (): ToastApi => useContext(Ctx);

/** Success is money-in, failure is money-out, neutral is an external reference. */
const EDGE: Record<ToastTone, string> = {
  success: "bg-rev",
  error: "bg-burn",
  info: "bg-info",
};

/**
 * A single toast: a role-coloured edge block, two lines of type, and a 4px
 * offset shadow so it reads as stacked above the page rather than floating on a
 * blur. Exported so pages can render one statically.
 */
export const Toast = ({
  title,
  body,
  tone = "info",
  onClose,
}: {
  title: string;
  body?: string;
  tone?: ToastTone;
  onClose?: () => void;
}) => (
  <div className="panel-raised animate-slide-in pointer-events-auto relative flex w-[min(92vw,22rem)] items-start gap-2.5 overflow-hidden py-3 pr-3 pl-3.5 shadow-lift">
    <span className={`absolute inset-y-0 left-0 w-1 ${EDGE[tone]}`} aria-hidden />
    <div className="min-w-0 flex-1">
      <div className="small font-semibold text-fg">{title}</div>
      {body && <div className="micro mt-1 leading-relaxed break-words text-fg-2">{body}</div>}
    </div>
    {onClose && (
      <button
        type="button"
        className="-mt-0.5 -mr-0.5 shrink-0 p-0.5 text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg"
        aria-label="Dismiss notification"
        onClick={onClose}
      >
        <IconX size={14} />
      </button>
    )}
  </div>
);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Live[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const push = useCallback((t: ToastSpec) => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);
    const ms = t.duration ?? 4000;
    if (ms > 0) timers.current.push(window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), ms));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast: push,
      success: (title, body) => push({ title, body, tone: "success" }),
      error: (title, body) => push({ title, body, tone: "error" }),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[60] flex flex-col items-end gap-2 sm:bottom-4"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <Toast
            key={t.id}
            title={t.title}
            body={t.body}
            tone={t.tone}
            onClose={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </Ctx.Provider>
  );
};
