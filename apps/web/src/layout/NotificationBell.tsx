import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import { useMarkNotificationsRead, useNotifications } from "../api/queries.js";
import { EmptyState } from "../components/EmptyState.js";
import { IconBell } from "../components/icons.js";
import { timeAgo } from "../lib/format.js";

/**
 * Header bell: an unread badge and a dropdown of recent items. Opening the
 * dropdown clears the unread count (the items stay listed), and any item with
 * an `href` navigates. Only mounts for a signed-in user; polling lives in the
 * query so the badge stays live without this component doing any timing.
 */
export const NotificationBell = () => {
  const auth = useAuth();
  const q = useNotifications(auth.authenticated);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  if (!auth.authenticated) return null;

  const items = q.data?.items ?? [];
  const unread = q.data?.unread ?? 0;

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead.mutate({});
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn relative px-2"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={onToggle}
      >
        <IconBell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center border border-bg bg-burn px-1 font-pixel text-[8px] leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="panel-raised absolute right-0 z-50 mt-2 w-[min(88vw,20rem)] overflow-hidden shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="label">notifications</span>
            {unread > 0 && (
              <button type="button" className="micro text-fg-2 transition-colors hover:text-fg" onClick={() => markRead.mutate({})}>
                mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <li>
                <EmptyState compact title="Nothing yet" body="Build, fee and reward updates will show up here." />
              </li>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className={`px-3 py-2.5 ${n.read ? "" : "bg-rev/5"}`}>
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-rev" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <div className="small font-semibold text-fg">{n.title}</div>
                        {n.body && <div className="micro mt-0.5 leading-relaxed break-words text-fg-2">{n.body}</div>}
                        <div className="micro mt-1 text-fg-3">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-b border-line/60 last:border-0">
                    {n.href ? (
                      <Link to={n.href} className="block transition-colors hover:bg-bg-3" onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
