import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, CircleSlash, FileText, Lightbulb, RotateCcw, Timer, Trophy, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn, fmtDate, fmtDuration, parseOptions, pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { ScoreRing } from "@/components/ScoreRing";

const LETTERS = "ABCDEFGH";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/attempt/${id}/result`);
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      assessment: true,
      questions: { orderBy: { position: "asc" }, include: { question: true } },
    },
  });
  const isAdmin = user.role === "ADMIN";
  if (!attempt || (attempt.userId !== user.id && !isAdmin)) notFound();
  if (attempt.status !== "SUBMITTED") {
    if (attempt.userId === user.id) redirect(`/attempt/${id}`);
    notFound();
  }

  const showReview = attempt.assessment.showReview || isAdmin;
  const score = attempt.score ?? 0;
  const answered = attempt.questions.filter((q) => q.selectedIndex !== null).length;
  const viewingOther = isAdmin && attempt.userId !== user.id;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={
          viewingOther
            ? { href: `/admin/assessments/${attempt.assessmentId}/results`, label: "Back to results" }
            : { href: "/history", label: "My results" }
        }
        eyebrow={viewingOther ? `${attempt.user.name} · ${attempt.user.email}` : undefined}
        title={attempt.assessment.title}
        description={`Attempt ${attempt.attemptNo} · submitted ${fmtDate(attempt.submittedAt)}`}
      />

      <section className="card overflow-hidden p-0">
        <div className={cn("h-1.5", attempt.passed ? "bg-emerald-500" : "bg-red-500")} />
        <div className="grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="justify-self-center">
            <ScoreRing value={attempt.percent ?? 0} size={148} stroke={12} passed={attempt.passed} />
          </div>
          <div className="text-center sm:text-left">
            <span
              className={cn(
                "badge px-3 py-1 text-sm ring-1 ring-inset",
                attempt.passed ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200",
              )}
            >
              {attempt.passed ? <Trophy size={14} /> : <XCircle size={14} />} {attempt.passed ? "Passed" : "Not passed"}
            </span>
            <p className="mt-3 text-xl font-semibold">
              {attempt.passed ? "Congratulations, well done!" : "You didn't reach the pass mark this time."}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              You scored <b>{score}</b> out of <b>{attempt.total}</b> ({pct(attempt.percent)}). Pass mark is {attempt.assessment.passPercent}%.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              <Mini icon={<CheckCircle2 size={15} />} value={score} label="Correct" className="text-emerald-600" />
              <Mini icon={<XCircle size={15} />} value={answered - score} label="Wrong" className="text-red-600" />
              <Mini icon={<CircleSlash size={15} />} value={attempt.total - answered} label="Skipped" className="text-slate-500" />
              <Mini icon={<Timer size={15} />} value={fmtDuration(attempt.startedAt, attempt.submittedAt)} label="Time" className="text-sky-600" />
            </div>
          </div>
        </div>
        {!viewingOther && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
            <Link href={`/a/${attempt.assessment.slug}`} className="btn-secondary btn-sm"><RotateCcw size={14} /> Assessment page</Link>
            <Link href="/history" className="btn-secondary btn-sm"><FileText size={14} /> All my results</Link>
          </div>
        )}
      </section>

      {showReview ? (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">Answer review</h2>
          {attempt.questions.map((aq, i) => {
            const opts = parseOptions(aq.question.options);
            const order: number[] = JSON.parse(aq.optionOrder);
            return (
              <section key={aq.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    <span className="mr-2 text-slate-400">Q{i + 1}.</span>
                    <span className="whitespace-pre-line">{aq.question.text}</span>
                  </p>
                  {aq.isCorrect ? (
                    <span className="badge shrink-0 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset"><CheckCircle2 size={12} /> Correct</span>
                  ) : aq.selectedIndex === null ? (
                    <span className="badge shrink-0 bg-slate-100 text-slate-600 ring-1 ring-slate-200 ring-inset"><CircleSlash size={12} /> Skipped</span>
                  ) : (
                    <span className="badge shrink-0 bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset"><XCircle size={12} /> Wrong</span>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {order.map((orig, di) => {
                    const isCorrect = orig === aq.question.correctIndex;
                    const isChosen = orig === aq.selectedIndex;
                    return (
                      <li
                        key={di}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border px-3 py-2",
                          isCorrect ? "border-emerald-300 bg-emerald-50" : isChosen ? "border-red-300 bg-red-50" : "border-slate-200",
                        )}
                      >
                        <span className="font-semibold text-slate-400">{LETTERS[di]}</span>
                        <span className="flex-1">{opts[orig]}</span>
                        {isCorrect && <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={13} /> Correct answer</span>}
                        {isChosen && !isCorrect && <span className="flex items-center gap-1 text-xs font-medium text-red-700"><XCircle size={13} /> Your answer</span>}
                      </li>
                    );
                  })}
                </ul>
                {aq.question.explanation && (
                  <p className="mt-3 flex gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                    <Lightbulb size={16} className="mt-0.5 shrink-0" /> <span>{aq.question.explanation}</span>
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">Detailed answer review is disabled for this assessment.</p>
      )}
    </div>
  );
}

function Mini({ icon, value, label, className }: { icon: React.ReactNode; value: React.ReactNode; label: string; className?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2.5">
      <p className={cn("flex items-center justify-center gap-1 text-base font-semibold tabular-nums", className)}>{icon}{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
