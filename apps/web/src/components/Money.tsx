import { formatUsd } from "../lib/format.js";
import { AnimatedNumber } from "./AnimatedNumber.js";

interface Props {
  usd: number;
  /** semantic role: `rev` = money in, `burn` = money out */
  tone?: "rev" | "burn" | "neutral" | "plain";
  className?: string;
  /** show cents-precision below $10k regardless of formatUsd's k/M shortening */
  exact?: boolean;
  /** lg/xl render as display figures; omit to inherit the surrounding type scale */
  size?: "sm" | "md" | "lg" | "xl";
  /** tween the figure when it changes (live revenue, budget, buybacks) */
  animate?: boolean;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  rev: "text-rev",
  burn: "text-burn",
  neutral: "text-fg",
  plain: "text-fg",
};

/** sm/md stay in the text scale; lg/xl are clamp-based display figures. */
const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "figure-lg",
  xl: "figure-hero",
};

export const Money = ({ usd, tone = "neutral", className = "", exact = false, size, animate = false }: Props) => {
  const display = size === "lg" || size === "xl";
  const format = (n: number): string =>
    exact ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatUsd(n);
  const cls = `${display ? "figure" : "num"} ${TONE[tone]} ${size ? SIZE[size] : ""} ${className}`;

  if (animate) return <AnimatedNumber value={usd} format={format} className={cls} />;
  return <span className={cls}>{format(usd)}</span>;
};
