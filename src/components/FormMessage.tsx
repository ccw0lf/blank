import { AlertCircle, CheckCircle2 } from "lucide-react";

export type FormState = { error?: string; success?: string } | undefined;

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="flex gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm whitespace-pre-line text-red-700 ring-1 ring-red-200 ring-inset">
        <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{state.error}</span>
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm whitespace-pre-line text-emerald-700 ring-1 ring-emerald-200 ring-inset">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> <span>{state.success}</span>
      </p>
    );
  return null;
}
