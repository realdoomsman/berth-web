import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/*
 * Reveals its children with the theme's `rise` the first time they scroll into
 * view. Only the entrance is deferred — the children are always rendered — and a
 * missing IntersectionObserver just shows everything at once. `prefers-reduced-
 * motion` collapses the animation globally, so this degrades to a plain appear.
 */
export const Reveal = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${shown ? "animate-rise" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
};
