"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import { saveQuestionAction } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionForm } from "@/components/ActionForm";

const LETTERS = "ABCDEFGH";

export function QuestionForm({
  assessmentId,
  question,
  topics,
}: {
  assessmentId: string;
  question?: { id: string; text: string; options: string[]; correctIndex: number; explanation: string | null; topic: string | null };
  topics: string[];
}) {
  const [state, action] = useActionState(saveQuestionAction, undefined);
  const [count, setCount] = useState(Math.max(4, question?.options.length ?? 4));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && !question) {
      formRef.current?.reset();
      setCount(4);
    }
  }, [state, question]);

  return (
    <ActionForm ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      {question && <input type="hidden" name="questionId" value={question.id} />}
      <div>
        <label className="label">Question *</label>
        <textarea name="text" rows={2} className="input" required defaultValue={question?.text} />
      </div>
      <div className="space-y-2">
        <label className="label">Options (select the correct one) *</label>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              value={i}
              defaultChecked={question ? question.correctIndex === i : i === 0}
              className="h-4 w-4 accent-emerald-600"
              aria-label={`Option ${LETTERS[i]} is correct`}
            />
            <span className="w-5 text-sm font-semibold text-slate-500">{LETTERS[i]}</span>
            <input name="option" className="input" defaultValue={question?.options[i] ?? ""} placeholder={i < 2 ? "Required" : "Optional"} />
          </div>
        ))}
        {count < 8 && (
          <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => setCount((c) => c + 1)}>
            <Plus size={14} className="mr-0.5 inline" />Add option
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="label">Explanation (shown after submission)</label>
          <input name="explanation" className="input" defaultValue={question?.explanation ?? ""} />
        </div>
        <div>
          <label className="label">Topic</label>
          <input name="topic" className="input" list={`topics-${assessmentId}`} defaultValue={question?.topic ?? ""} />
          <datalist id={`topics-${assessmentId}`}>
            {topics.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{question ? <><Save size={16} /> Save changes</> : <><Plus size={16} /> Add question</>}</SubmitButton>
    </ActionForm>
  );
}
