import { useEffect, useState } from "react";
import { useReport } from "../../api/queries.js";
import { useAuth } from "../../auth/useAuth.js";
import { Modal } from "../../components/Modal.js";

const KINDS = ["ABUSE", "DMCA", "IMPERSONATION", "OTHER"] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABEL: Record<Kind, string> = {
  ABUSE: "Abuse / prohibited content",
  DMCA: "Copyright (DMCA)",
  IMPERSONATION: "Impersonation",
  OTHER: "Other",
};

export const ReportModal = ({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) => {
  const auth = useAuth();
  const report = useReport();
  const [kind, setKind] = useState<Kind>("ABUSE");
  const [reporter, setReporter] = useState(auth.displayName ?? auth.wallet ?? "");
  const [details, setDetails] = useState("");

  // The modal stays mounted when closed, so wipe success + form state on close
  // to avoid showing a stale "report received" screen on the next open.
  useEffect(() => {
    if (!open) {
      report.reset();
      setKind("ABUSE");
      setDetails("");
      setReporter(auth.displayName ?? auth.wallet ?? "");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Report this app" width="sm">
      {report.isSuccess ? (
        <div className="text-sm">
          <div className="font-semibold text-rev">Report received</div>
          <p className="mt-1 text-fg-2">
            Reference <span className="num">{report.data.id}</span>. Ops reviews reports within 24h; DMCA notices are actioned per our{" "}
            <a href="/legal/content-policy" className="underline">
              content policy
            </a>
            .
          </p>
          <button type="button" className="btn mt-3" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <label className="block">
            <span className="small text-fg-2">Reason</span>
            <select className="input mt-1" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="small text-fg-2">Your contact (email or wallet)</span>
            <input className="input mt-1" value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="small text-fg-2">Details</span>
            <textarea
              className="input mt-1 min-h-[100px]"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={4000}
              placeholder={kind === "DMCA" ? "Identify the work, where it appears in the app, and a good-faith statement of ownership." : "What's wrong?"}
            />
          </label>
          {report.error && <div className="text-xs text-burn">{report.error.message}</div>}
          <button
            type="button"
            className="btn btn-danger"
            disabled={report.isPending || details.trim().length < 10 || reporter.trim().length < 3}
            onClick={() => report.mutate({ slug, reporter: reporter.trim(), kind, details: details.trim() })}
          >
            {report.isPending ? "Sending…" : "Submit report"}
          </button>
        </div>
      )}
    </Modal>
  );
};
