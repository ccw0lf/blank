import { CheckCircle2, FileUp, Pencil, Plus, Power, PowerOff, Trash2, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { cn, parseOptions, pct } from "@/lib/utils";
import { deleteQuestionAction, toggleQuestionAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { QuestionForm } from "./QuestionForm";
import { UploadForm } from "./UploadForm";
import { Collapsible } from "@/components/Collapsible";

const LETTERS = "ABCDEFGH";

export default async function QuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; topic?: string }>;
}) {
  const { id } = await params;
  const { created, topic } = await searchParams;
  const a = await prisma.assessment.findUniqueOrThrow({ where: { id } });
  const questions = await prisma.question.findMany({
    where: { assessmentId: id },
    orderBy: { createdAt: "asc" },
  });
  const stats = await prisma.attemptQuestion.groupBy({
    by: ["questionId", "isCorrect"],
    where: { question: { assessmentId: id }, attempt: { status: "SUBMITTED" } },
    _count: { _all: true },
  });
  const acc = new Map<string, { right: number; total: number }>();
  for (const s of stats) {
    const e = acc.get(s.questionId) ?? { right: 0, total: 0 };
    e.total += s._count._all;
    if (s.isCorrect) e.right += s._count._all;
    acc.set(s.questionId, e);
  }
  const topics = [...new Set(questions.map((q) => q.topic).filter(Boolean))] as string[];
  const active = questions.filter((q) => q.isActive).length;
  const shown = topic ? questions.filter((q) => (q.topic ?? "") === topic) : questions;

  return (
    <div className="space-y-6">
      {created && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200 ring-inset">
          <CheckCircle2 size={16} /> Assessment created. Now add questions by hand or import a CSV, then publish it.
        </p>
      )}
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset",
          active > a.questionsPerAttempt ? "bg-white text-slate-700 ring-slate-200" : "bg-amber-50 text-amber-800 ring-amber-200",
        )}
      >
        <Layers size={16} className="mt-0.5 shrink-0" /><span><b>{active}</b> active question(s) in the pool · <b>{a.questionsPerAttempt}</b> randomly picked for each student.
        {active <= a.questionsPerAttempt && " Add more questions than the per-student count so students get different sets."}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Collapsible title={<span className="inline-flex items-center gap-2"><Plus size={18} className="text-brand-600" /> Add a question</span>} defaultOpen={questions.length === 0}>
          <QuestionForm assessmentId={id} topics={topics} />
        </Collapsible>
        <Collapsible title={<span className="inline-flex items-center gap-2"><FileUp size={18} className="text-brand-600" /> Bulk upload (CSV)</span>} defaultOpen={questions.length === 0}>
          <UploadForm assessmentId={id} />
        </Collapsible>
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="?" className={cn("badge px-3 py-1", !topic ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700")}>All</a>
          {topics.map((t) => (
            <a key={t} href={`?topic=${encodeURIComponent(t)}`} className={cn("badge px-3 py-1", topic === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700")}>
              {t} ({questions.filter((q) => q.topic === t).length})
            </a>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {shown.length === 0 && <p className="card text-center text-slate-500">No questions yet.</p>}
        {shown.map((q) => {
          const opts = parseOptions(q.options);
          const s = acc.get(q.id);
          const n = questions.indexOf(q) + 1;
          return (
            <div key={q.id} className={cn("card", !q.isActive && "opacity-60")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <span className="mr-2 text-slate-400">#{n}</span>
                    <span className="whitespace-pre-line">{q.text}</span>
                  </p>
                  <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {opts.map((o, i) => (
                      <li key={i} className={cn("rounded px-2 py-1", i === q.correctIndex ? "bg-emerald-50 font-medium text-emerald-800" : "text-slate-600")}>
                        {LETTERS[i]}. {o} {i === q.correctIndex && "✓"}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {q.topic && <span className="badge bg-indigo-50 text-indigo-700">{q.topic}</span>}
                    {!q.isActive && <span className="badge bg-slate-200 text-slate-700">Inactive</span>}
                    <span>Served {q.timesServed}×</span>
                    {s && s.total > 0 && (
                      <span className={s.right / s.total < 0.4 ? "text-red-600" : ""}>
                        · Answered correctly {pct((s.right / s.total) * 100)} ({s.right}/{s.total})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={toggleQuestionAction}>
                    <input type="hidden" name="id" value={q.id} />
                    <SubmitButton className="btn-secondary btn-sm">{q.isActive ? <><PowerOff size={14} /> Deactivate</> : <><Power size={14} /> Activate</>}</SubmitButton>
                  </form>
                  <form action={deleteQuestionAction}>
                    <input type="hidden" name="id" value={q.id} />
                    <SubmitButton
                      className="btn-secondary btn-sm text-red-600"
                      confirm={q.timesServed > 0 ? "Students have already seen this question, so it will be deactivated instead of deleted. Continue?" : "Delete this question?"}
                    >
                      <Trash2 size={14} /> Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
              <Collapsible
                title={<span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600"><Pencil size={14} /> Edit</span>}
                className="mt-3 border-t border-slate-100 pt-3"
              >
                <QuestionForm assessmentId={id} topics={topics} question={{ ...q, options: opts }} />
              </Collapsible>
            </div>
          );
        })}
      </div>
    </div>
  );
}
