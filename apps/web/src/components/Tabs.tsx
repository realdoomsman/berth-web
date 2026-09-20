import type { ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

interface Props<T extends string> {
  items: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Underlined tab strip. Tabs are chrome, not prose, so they take the pixel
 * voice at 12px — a step on Silkscreen's whole-pixel scale — while a count
 * stays monospace because it is a number. Scrolls horizontally on narrow
 * screens instead of wrapping.
 */
export const Tabs = <T extends string>({ items, active, onChange, className = "", ariaLabel }: Props<T>) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={`flex items-center gap-5 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
  >
    {items.map((it) => (
      <button
        key={it.id}
        type="button"
        role="tab"
        aria-selected={it.id === active}
        disabled={it.disabled}
        data-active={it.id === active}
        className="tab font-pixel text-[12px] font-normal tracking-[0.04em] uppercase shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(it.id)}
      >
        {it.label}
        {it.count !== undefined && <span className="num ml-1.5 text-xs text-fg-2">{it.count}</span>}
      </button>
    ))}
  </div>
);
