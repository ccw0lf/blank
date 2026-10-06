"use client";
import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { PendingContext } from "./ActionForm";

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
  confirm,
  title,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  confirm?: string;
  title?: string;
}) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      aria-label={title}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" /> {pendingText ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
