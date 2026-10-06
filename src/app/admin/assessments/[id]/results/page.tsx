import Link from "next/link";
import { Download, Eye, Filter, RotateCcw, Search } from "lucide-react";
import { Repeat } from "lucide-react";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { cn, fmtDate, pct } from "@/lib/utils";
import { deleteAttemptAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList } from "lucide-react";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { id } = await params;
  const { q, status } = await searchParams;
  await finalizeExpired({ assessmentId: id });

  const attempts = await prisma.attempt.findMany({
    where: {
      assessmentId: id,
      ...(q ? { user: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } } : {}),
      ...(status === "passed" ? { passed: true } : status === "failed" ? { passed: false } : status === "progress" ? { status: "IN_PROGRESS" } : {}),
    },
    include: { user: { select: { name: true, email: true, department: true } }, assessment: { select: { title: true } } },
    orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
  });

  // Per-question difficulty analysis
  const rows = await prisma.attemptQuestion.findMany({
    where: { attempt: { assessmentId: id, status: "SUBMITTED" } },
    select: { questionId: true, isCorrect: true, selectedIndex: true, question: { select: { text: true } } },
  });
  const perQ = new Map<string, { text: string; total: number; right: number; skipped: number }>();
  for (const r of rows) {
    const e = perQ.get(r.questionId) ?? { text: r.question.text, total: 0, right: 0, skipped: 0 };
    e.total++;
    if (r.isCorrect) e.right++;
    if (r.selectedIndex === null) e.skipped++;
    perQ.set(r.questionId, e);
  }
  const hardest = [...perQ.values()].sort((a, b) => a.right / a.total - b.right / b.total).slice(0, 10);

  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id }, select: { maxRetakes: true } });
  const perUser = new Map<string, { name: string; email: string; attempts: number; best: number; submitted: number }>();
  const everyone = await prisma.attempt.findMany({
    where: { assessmentId: id },
    select: { userId: true, status: true, percent: true, user: { select: { name: true, email: true } } },
  });
  for (const t of everyone) {
    const e = perUser.get(t.userId) ?? { name: t.user.name, email: t.user.email, attempts: 0, best: 0, submitted: 0 };
    e.attempts++;
    if (t.status === "SUBMITTED") {
      e.submitted++;
      e.best = Math.max(e.best, t.percent ?? 0);
    }
    perUser.set(t.userId, e);
  }
  const participantRows = [...perUser.values()].sort((a, b) => b.attempts - a.attempts || a.name.localeCompare(b.name));
  const totalRetakes = participantRows.reduce((s, u) => s + Math.max(0, u.attempts - 1), 0);

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="flex items-center gap-2 font-semibold"><Repeat size={18} className="text-slate-400" /> Retakes by participant</h2>
          <p className="text-sm text-slate-500">
            {totalRetakes} retake{totalRetakes === 1 ? "" : "s"} taken · limit: {assessment.maxRetakes === null ? "unlimited" : assessment.maxRetakes === 0 ? "none" : `${assessment.maxRetakes} per student`}
          </p>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="table">
            <thead><tr><th>Participant</th><th className="num">Attempts</th><th className="num">Retakes taken</th><th className="num">Retakes left</th><th className="num">Best score</th></tr></thead>
            <tbody>
              {participantRows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No participants yet.</td></tr>}
              {participantRows.map((u) => {
                const taken = Math.max(0, u.attempts - 1);
                const left = assessment.maxRetakes === null ? "∞" : Math.max(0, assessment.maxRetakes - taken);
                return (
                  <tr key={u.email}>
                    <td><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                    <td className="num">{u.attempts}</td>
                    <td className="num">{taken}</td>
                    <td className="num">{left}</td>
                    <td className="num">{u.submitted ? pct(u.best) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search name or email" className="input w-64 pl-9" />
          </div>
          <select name="status" defaultValue={status ?? ""} className="input w-40">
            <option value="">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="progress">In progress</option>
          </select>
          <button className="btn-secondary"><Filter size={16} /> Filter</button>
        </form>
        <a href={`/api/admin/assessments/${id}/export`} className="btn-primary"><Download size={16} /> Export CSV</a>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="table compact">
          <thead>
            <tr><th>Participant</th><th>Assessment</th><th>Attempt</th><th>Submitted</th><th className="num">Score</th><th>Result</th><th className="act"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {attempts.length === 0 && <tr><td colSpan={7}><EmptyState icon={<ClipboardList />} title="No attempts found">Results will appear here once participants take the assessment.</EmptyState></td></tr>}
            {attempts.map((a) => (
              <tr key={a.id}>
                <td>
                  <p className="font-medium">{a.user.name}</p>
                  <p className="text-xs text-slate-500">{a.user.email}{a.user.department ? ` · ${a.user.department}` : ""}</p>
                </td>
                <td className="min-w-40 font-medium">{a.assessment.title}</td>
                <td className="whitespace-nowrap">#{a.attemptNo}{a.attemptNo > 1 && <span className="badge ml-2 bg-violet-50 text-violet-700 ring-1 ring-violet-200 ring-inset">Retake {a.attemptNo - 1}</span>}</td>
                <td className="whitespace-nowrap text-slate-500">{fmtDate(a.submittedAt)}</td>
                <td className="num">{a.status === "SUBMITTED" ? `${a.score}/${a.total} (${pct(a.percent)})` : "—"}</td>
                <td><StatusBadge status={a.status} passed={a.passed} /></td>
                <td className="act">
                  <div className="flex justify-end gap-2">
                    {a.status === "SUBMITTED" && (
                      <Link href={`/attempt/${a.id}/result`} className="btn-secondary btn-sm"><Eye size={14} /> Review</Link>
                    )}
                    <form action={deleteAttemptAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton className="btn-secondary btn-sm text-red-600" title="Reset attempt" confirm={`Delete this attempt? ${a.user.name} will get the attempt back and can retake the test.`}>
                        <RotateCcw size={14} />
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <section className="card">
        <h2 className="font-semibold">Question difficulty</h2>
        <p className="text-sm text-slate-600">Questions with the lowest correct-answer rate. They may need to be covered again in training, or reworded.</p>
        {hardest.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No data yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {hardest.map((h, i) => {
              const rate = (h.right / h.total) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="truncate">{h.text}</span>
                    <span className="whitespace-nowrap text-slate-500 tabular-nums">
                      {pct(rate)} correct · {h.total} answered{h.skipped ? ` · ${h.skipped} skipped` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn("h-full", rate < 40 ? "bg-red-500" : rate < 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
