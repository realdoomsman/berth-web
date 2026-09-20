import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "./icons.js";

interface Props {
  value: string;
  label?: string;
  className?: string;
  /** tighter row for inline use inside dense panels */
  compact?: boolean;
  /** show the value in full across lines instead of truncating — for hashes and attestations */
  wrap?: boolean;
}

/** A value you are meant to copy: recessed mono well plus an affirming button. */
export const CopyField = ({ value, label, className = "", compact = false, wrap = false }: Props) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      <div className={`flex items-stretch gap-1.5 ${label ? "mt-1.5" : ""}`}>
        <code
          className={`num panel-inset min-w-0 flex-1 text-xs leading-normal text-fg-2 ${
            wrap ? "break-all whitespace-normal" : "truncate"
          } ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`}
          title={value}
        >
          {value}
        </code>
        <button
          type="button"
          className={`btn shrink-0 text-xs transition-colors ${compact ? "px-2 py-1.5" : "px-2.5 py-2"} ${
            copied ? "border-rev/45 bg-rev/10 text-rev" : ""
          }`}
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              if (timer.current !== null) window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
};
