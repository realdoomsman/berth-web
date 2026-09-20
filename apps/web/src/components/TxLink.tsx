import { explorerAddress, explorerTx } from "../env.js";
import { shortAddr } from "../lib/format.js";
import { IconExternal } from "./icons.js";

interface Props {
  sig?: string | null;
  address?: string | null;
  label?: string;
  className?: string;
}

/**
 * External link to Solscan for a tx signature or an account. Info role, because
 * it leaves the product — and it is the receipt for a money claim, so the
 * underline is always available, not hover-only, on focus.
 */
export const TxLink = ({ sig, address, label, className = "" }: Props) => {
  const value = sig ?? address;
  if (!value) return <span className="num text-fg-2">—</span>;
  return (
    <a
      href={sig ? explorerTx(sig) : explorerAddress(value)}
      target="_blank"
      rel="noreferrer noopener"
      className={`num inline-flex items-center gap-1 text-info decoration-info/40 underline-offset-[3px] transition-colors hover:text-info hover:underline focus-visible:underline ${className}`}
      title={`${sig ? "transaction" : "account"} ${value} — opens Solscan`}
    >
      {label ?? shortAddr(value, sig ? 6 : 4)}
      <IconExternal size={11} className="text-info/55" />
    </a>
  );
};
