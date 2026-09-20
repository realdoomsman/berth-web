import { useEffect, useRef, useState } from "react";

/** Shared with Tabs: motion is opt-out, so read the query at animation time. */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/* Ease-out so the number decelerates into its final value instead of stopping dead. */
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t);

/**
 * Tween a changing number. Returns the displayed value, which walks from the
 * previous value to `value` over `duration` ms. Mounting does not animate —
 * only later changes do, so a page load shows real figures immediately and a
 * live update reads as movement.
 */
export const useCountUp = (value: number, duration = 650): number => {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    if (from.current === value) return;
    if (window.matchMedia(REDUCED_MOTION).matches || !Number.isFinite(value) || !Number.isFinite(from.current)) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(origin + delta * easeOut(t));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else from.current = value;
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return shown;
};

interface Props {
  value: number;
  /** how to render the tweened value; defaults to a rounded integer with separators */
  format?: (n: number) => string;
  /** ms for the transition; 0 disables it */
  duration?: number;
  className?: string;
  /** flash the value in the money-in / money-out role colour when it moves */
  flash?: boolean;
}

const localized = (n: number): string => Math.round(n).toLocaleString("en-US");

/**
 * A figure that animates between values. Tabular monospace, so digits never
 * shift the layout mid-tween. Respects `prefers-reduced-motion`.
 */
export const AnimatedNumber = ({ value, format = localized, duration = 650, className = "", flash = false }: Props) => {
  const shown = useCountUp(value, duration);
  const prev = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!flash || prev.current === value) return;
    setDir(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = window.setTimeout(() => setDir(null), 900);
    return () => window.clearTimeout(t);
  }, [value, flash]);

  return (
    <span
      className={`num tabular-nums transition-colors duration-500 ${
        dir === "up" ? "text-rev" : dir === "down" ? "text-burn" : ""
      } ${className}`}
      style={dir === null ? undefined : { transitionDuration: "120ms" }}
    >
      {format(shown)}
    </span>
  );
};
