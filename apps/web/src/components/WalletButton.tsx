import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import { shortAddr } from "../lib/format.js";
import { useMe } from "../api/queries.js";
import { IconChevron, IconCopy, IconLock, IconUsers } from "./icons.js";
import { StatusBlock } from "./StatusBadge.js";
import { useToast } from "./Toast.js";

const ITEM = "flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm transition-colors hover:bg-bg-3";

export const WalletButton = () => {
  const auth = useAuth();
  const me = useMe(auth.authenticated);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!auth.ready) return <span className="skeleton h-9 w-[5.5rem]" aria-hidden />;
  if (!auth.authenticated) {
    /* Launch is the header's primary action; signing in is a secondary one. */
    return (
      <button type="button" className="btn" onClick={auth.login}>
        Sign in
      </button>
    );
  }

  const label = auth.wallet ? shortAddr(auth.wallet) : (auth.displayName ?? "account");
  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className={`btn px-2.5 py-1.5 ${open ? "border-line-2 bg-bg-2" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <StatusBlock tone="in" size={6} />
        <span className="num text-xs">{label}</span>
        <IconChevron size={12} dir={open ? "up" : "down"} className="text-fg-2" />
      </button>
      {open && (
        <div className="panel-raised animate-rise absolute right-0 z-40 mt-2 w-64 p-1.5 shadow-lift" role="menu">
          <div className="border-b border-line px-2.5 pt-1 pb-2.5">
            <div className="label">{auth.displayName ? "Signed in as" : "Signed in"}</div>
            <div className="mt-1 truncate text-sm font-semibold">{auth.displayName ?? "wallet"}</div>
            {auth.wallet && <div className="num mt-0.5 truncate text-[11px] text-fg-2">{auth.wallet}</div>}
          </div>
          <div className="pt-1.5">
            <Link to="/me" className={ITEM} role="menuitem" onClick={() => setOpen(false)}>
              <IconUsers size={14} className="text-fg-3" />
              Dashboard
            </Link>
            {auth.wallet && (
              <button
                type="button"
                className={ITEM}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  const clip = navigator.clipboard;
                  if (!clip?.writeText) {
                    error("Copy failed", "Select and copy the address manually.");
                    return;
                  }
                  void clip
                    .writeText(auth.wallet!)
                    .then(() => success("Address copied"))
                    .catch(() => error("Copy failed", "Select and copy the address manually."));
                }}
              >
                <IconCopy size={14} className="text-fg-3" />
                Copy address
              </button>
            )}
            {me.data?.isAdmin && (
              <Link to="/ops" className={ITEM} role="menuitem" onClick={() => setOpen(false)}>
                <IconLock size={14} className="text-fg-3" />
                Ops
              </Link>
            )}
            <button
              type="button"
              className={`${ITEM} mt-1 border-t border-line text-fg-2 hover:text-fg`}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void auth.logout();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
