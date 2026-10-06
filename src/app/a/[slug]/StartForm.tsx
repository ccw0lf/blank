"use client";
import { useActionState } from "react";
import { startAttemptAction } from "@/app/actions/quiz";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function StartForm({ assessmentId, label }: { assessmentId: string; label: string }) {
  const [state, action] = useActionState(startAttemptAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full sm:w-auto" pendingText="Preparing your questions…">
        {label}
      </SubmitButton>
    </form>
  );
}
