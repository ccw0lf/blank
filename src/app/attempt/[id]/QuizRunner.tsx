"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAnswerAction, submitAttemptAction } from "@/app/actions/quiz";
import { cn } from "@/lib/utils";

export type RunnerQuestion = { id: string; text: string; options: string[]; selected: number | null };

const LETTERS = "ABCDEFGH";

export function QuizRunner({
  attemptId,
  title,
  deadline,
  questions,
}: {
  attemptId: string;
  title: string;
  deadline: string | null;
  questions: RunnerQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.selected])),
  );
  const [saving, setSaving] = useState<Record<string, "saving" | "error" | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(() =>
    deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : null,
  );
  const submittedRef = useRef(false);

  const answered = Object.values(answers).filter((v) => v !== null).length;

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      if (!auto) {
        const unanswered = questions.length - answered;
        const msg = unanswered
          ? `You have ${unanswered} unanswered question(s). Submit anyway?`
          : "Submit your answers? You can't change them afterwards.";
        if (!window.confirm(msg)) return;
      }
      submittedRef.current = true;
      setSubmitting(true);
      const res = await submitAttemptAction(attemptId);
      if (!res.ok) {
        submittedRef.current = false;
        setSubmitting(false);
        setError(res.error);
        return;
      }
      router.replace(`/attempt/${attemptId}/result`);
    },
    [answered, attemptId, questions.length, router],
  );

  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const t = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      setRemaining(left);
      if (left === 0) {
        clearInterval(t);
        void submit(true);
      }
    }, 500);
    return () => clearInterval(t);
  }, [deadline, submit]);

  // Warn before leaving mid-test (answers are saved, but the timer keeps running).
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  async function choose(qid: string, idx: number) {
    const prev = answers[qid];
    setAnswers((a) => ({ ...a, [qid]: idx }));
    setSaving((s) => ({ ...s, [qid]: "saving" }));
    const res = await saveAnswerAction(attemptId, qid, idx);
    if (res.ok) setSaving((s) => ({ ...s, [qid]: undefined }));
    else {
      setAnswers((a) => ({ ...a, [qid]: prev }));
      setSaving((s) => ({ ...s, [qid]: "error" }));
      setError(res.error);
    }
  }

  const mins = remaining !== null ? Math.floor(remaining / 60000) : 0;
  const secs = remaining !== null ? Math.floor((remaining % 60000) / 1000) : 0;
  const lowTime = remaining !== null && remaining < 60_000;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{title}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${(answered / questions.length) * 100}%` }}
                />
              </div>
              <span className="text-xs whitespace-nowrap text-slate-500 tabular-nums">
                {answered}/{questions.length} answered
              </span>
            </div>
          </div>
          {remaining !== null && (
            <div
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums",
                lowTime ? "animate-pulse bg-red-100 text-red-700" : "bg-slate-100 text-slate-700",
              )}
              aria-live="polite"
            >
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
          )}
          <button className="btn-primary" disabled={submitting} onClick={() => submit(false)}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 select-none">
        {error && (
          <div className="flex items-start justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            <button className="ml-4 font-medium" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <nav className="card flex flex-wrap gap-2 p-3" aria-label="Question navigator">
          {questions.map((q, i) => (
            <a
              key={q.id}
              href={`#q-${i + 1}`}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md text-xs font-medium",
                answers[q.id] !== null ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {i + 1}
            </a>
          ))}
        </nav>

        {questions.map((q, i) => (
          <section key={q.id} id={`q-${i + 1}`} className="card scroll-mt-24">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">
                <span className="mr-2 text-slate-400">Q{i + 1}.</span>
                <span className="whitespace-pre-line">{q.text}</span>
              </p>
              <span className="text-xs whitespace-nowrap text-slate-400">
                {saving[q.id] === "saving" ? "Saving…" : saving[q.id] === "error" ? "Not saved" : answers[q.id] !== null ? "Saved" : ""}
              </span>
            </div>
            <div className="mt-4 space-y-2" role="radiogroup">
              {q.options.map((opt, oi) => {
                const checked = answers[q.id] === oi;
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500",
                      checked ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={q.id}
                      checked={checked}
                      disabled={submitting}
                      onChange={() => choose(q.id, oi)}
                    />
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                        checked ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-500",
                      )}
                    >
                      {LETTERS[oi]}
                    </span>
                    <span className="pt-0.5">{opt}</span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex justify-end pb-10">
          <button className="btn-primary" disabled={submitting} onClick={() => submit(false)}>
            {submitting ? "Submitting…" : "Submit assessment"}
          </button>
        </div>
      </main>
    </div>
  );
}
