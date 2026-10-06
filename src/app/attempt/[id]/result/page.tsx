import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn, fmtDate, parseOptions, pct } from "@/lib/utils";
import { TopBar } from "@/components/TopBar";

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
  const answered = attempt.questions.filter((q) => q.selectedIndex !== null).length;
  const durationMin = attempt.submittedAt
    ? Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000))
    : null;

  return (
    <>
      <TopBar
        user={user}
        links={isAdmin ? [{ href: `/admin/assessments/${attempt.assessmentId}/results`, label: "← Back to results" }] : [{ href: "/dashboard", label: "My results" }]}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="card p-8 text-center">
          {isAdmin && attempt.userId !== user.id && (
            <p className="mb-2 text-sm text-slate-500">{attempt.user.name} · {attempt.user.email}</p>
          )}
          <p className="text-sm text-slate-500">{attempt.assessment.title} · Attempt {attempt.attemptNo}</p>
          <div
            className={cn(
              "mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full border-8 text-3xl font-bold",
              attempt.passed ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700",
            )}
          >
            {pct(attempt.percent)}
          </div>
          <p className="mt-4 text-xl font-semibold">
            {attempt.passed ? "🎉 Congratulations, you passed!" : "You did not reach the pass mark this time."}
          </p>
          <p className="mt-1 text-slate-600">
            You scored <b>{attempt.score}</b> out of <b>{attempt.total}</b> (pass mark {attempt.assessment.passPercent}%).
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <Mini label="Correct" value={attempt.score ?? 0} className="text-emerald-700" />
            <Mini label="Wrong" value={answered - (attempt.score ?? 0)} className="text-red-700" />
            <Mini label="Unanswered" value={attempt.total - answered} className="text-slate-600" />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Submitted {fmtDate(attempt.submittedAt)}{durationMin ? ` · took about ${durationMin} min` : ""}
          </p>
          {!isAdmin && (
            <Link href={`/a/${attempt.assessment.slug}`} className="btn-secondary mt-6">Back to assessment</Link>
          )}
        </div>

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
                      <span className="badge bg-emerald-100 text-emerald-800">Correct</span>
                    ) : aq.selectedIndex === null ? (
                      <span className="badge bg-slate-100 text-slate-700">Skipped</span>
                    ) : (
                      <span className="badge bg-red-100 text-red-800">Wrong</span>
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
                            "flex items-start gap-2 rounded-lg border px-3 py-2",
                            isCorrect ? "border-emerald-300 bg-emerald-50" : isChosen ? "border-red-300 bg-red-50" : "border-slate-200",
                          )}
                        >
                          <span className="font-semibold text-slate-500">{LETTERS[di]}.</span>
                          <span className="flex-1">{opts[orig]}</span>
                          {isCorrect && <span className="text-xs font-medium text-emerald-700">Correct answer</span>}
                          {isChosen && !isCorrect && <span className="text-xs font-medium text-red-700">Your answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {aq.question.explanation && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <b>Explanation:</b> {aq.question.explanation}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">Detailed answer review is disabled for this assessment.</p>
        )}
      </main>
    </>
  );
}

function Mini({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className={cn("text-xl font-semibold tabular-nums", className)}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
