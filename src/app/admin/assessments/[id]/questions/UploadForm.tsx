"use client";
import { useActionState, useRef, useEffect } from "react";
import { uploadQuestionsAction } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionForm } from "@/components/ActionForm";

export function UploadForm({ assessmentId }: { assessmentId: string }) {
  const [state, action] = useActionState(uploadQuestionsAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <ActionForm ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <p>
          CSV columns: <code className="text-xs">question, option_a, option_b, option_c, option_d, answer, explanation, topic</code>.
          Up to 8 options (option_a … option_h). <code>answer</code> can be a letter (B), a number (2) or the exact option text.
        </p>
        <a href="/api/admin/template" className="mt-2 inline-block font-medium text-brand-600 hover:underline">Download CSV template</a>
        <span className="text-slate-400"> · Excel: File → Save As → CSV UTF-8</span>
      </div>
      <div>
        <label className="label">CSV file</label>
        <input type="file" name="file" accept=".csv,text/csv" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700" />
      </div>
      <div>
        <label className="label">…or paste CSV text</label>
        <textarea name="csv" rows={5} className="input font-mono text-xs" placeholder="question,option_a,option_b,option_c,option_d,answer" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="skipInvalid" className="h-4 w-4 accent-brand-600" /> Skip invalid rows and import the rest
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Importing…">Import questions</SubmitButton>
    </ActionForm>
  );
}
