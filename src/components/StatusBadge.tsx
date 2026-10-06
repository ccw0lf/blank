import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export function StatusBadge({ status, passed }: { status: string; passed: boolean | null }) {
  if (status !== "SUBMITTED")
    return (
      <span className="badge bg-sky-50 text-sky-700 ring-1 ring-sky-200 ring-inset">
        <Clock3 size={12} /> In progress
      </span>
    );
  return passed ? (
    <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset">
      <CheckCircle2 size={12} /> Passed
    </span>
  ) : (
    <span className="badge bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset">
      <XCircle size={12} /> Failed
    </span>
  );
}

export function PublishBadge({ live }: { live: boolean }) {
  return live ? (
    <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
    </span>
  ) : (
    <span className="badge bg-slate-100 text-slate-600 ring-1 ring-slate-200 ring-inset">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Draft
    </span>
  );
}
