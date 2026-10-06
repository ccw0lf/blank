import Link from "next/link";
import { Award, CheckCircle2, ClipboardCheck, Eye, History, Search, Target, Timer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { fmtDate, fmtDateShort, fmtDuration, pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { StatusBadge } from "@/components/StatusBadge";
import { TrendChart, ProgressBar } from "@/components/Charts";
import { EmptyState } from "@/components/EmptyState";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; assessment?: string }>;
}) {
  const user = await requireUser("/history");
  const { q, status, assessment } = await searchParams;
  await finalizeExpired({ userId: user.id });

  const all = await prisma.attempt.findMany({
    where: { userId: user.id },
    include: { assessment: { select: { id: true, title: true, passPercent: true, trainingSession: true } } },
    orderBy: { startedAt: "desc" },
  });
  const done = all.filter((a) => a.status === "SUBMITTED");
  const passed = done.filter((a) => a.passed).length;
  const avg = done.length ? done.reduce((s, a) => s + (a.percent ?? 0), 0) / done.length : null;
  const best = done.length ? Math.max(...done.map((a) => a.percent ?? 0)) : null;
  const totalMs = done.reduce((s, a) => s + (a.submittedAt ? a.submittedAt.getTime() - a.startedAt.getTime() : 0), 0);

  // Per-assessment summary
  const byAssessment = new Map<string, { title: string; passMark: number; attempts: typeof done }>();
  for (const a of done) {
    const e = byAssessment.get(a.assessmentId) ?? { title: a.assessment.title, passMark: a.assessment.passPercent, attempts: [] };
    e.attempts.push(a);
    byAssessment.set(a.assessmentId, e);
  }

  const needle = q?.trim().toLowerCase();
  const filtered = all.filter(
    (a) =>
      (!assessment || a.assessmentId === assessment) &&
      (!needle || a.assessment.title.toLowerCase().includes(needle)) &&
      (!status ||
        (status === "passed" && a.passed === true) ||
        (status === "failed" && a.status === "SUBMITTED" && a.passed === false) ||
        (status === "progress" && a.status === "IN_PROGRESS")),
  );

  const trend = [...done].reverse().slice(-15).map((a) => ({ label: fmtDateShort(a.submittedAt), value: a.percent ?? 0, passed: a.passed }));

  return (
    <>
      <PageHeader
        title="My Results"
        description="Your full assessment history, scores and progress."
        actions={
          <Link href="/assessments" className="btn-secondary">
            <ClipboardCheck size={16} /> Assessments
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Attempts" value={all.length} icon={<History />} tone="brand" hint={`${done.length} submitted · ${all.filter((a) => a.attemptNo > 1).length} retakes`} />
        <Stat label="Passed" value={passed} icon={<CheckCircle2 />} tone="green" hint={done.length ? `${pct((passed / done.length) * 100)} pass rate` : undefined} />
        <Stat label="Average" value={pct(avg)} icon={<Target />} tone="violet" />
        <Stat label="Best score" value={pct(best)} icon={<Award />} tone="amber" />
        <Stat label="Time spent" value={done.length ? `${Math.max(1, Math.round(totalMs / 60000))} min` : "—"} icon={<Timer />} tone="sky" />
      </div>

      {done.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section className="card lg:col-span-3">
            <h2 className="mb-4 font-semibold">Score progression</h2>
            <TrendChart points={trend} />
          </section>
          <section className="card lg:col-span-2">
            <h2 className="mb-4 font-semibold">By assessment</h2>
            <ul className="space-y-4">
              {[...byAssessment.entries()].map(([id, e]) => {
                const b = Math.max(...e.attempts.map((a) => a.percent ?? 0));
                return (
                  <li key={id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/history?assessment=${id}`} className="truncate font-medium hover:text-brand-600">{e.title}</Link>
                      <span className="shrink-0 text-xs text-slate-500">{e.attempts.length} attempt{e.attempts.length > 1 ? "s" : ""} · {Math.max(0, Math.max(...e.attempts.map((x) => x.attemptNo)) - 1)} retake(s) · best {pct(b)}</span>
                    </div>
                    <div className="mt-1.5"><ProgressBar value={b} tone={b >= e.passMark ? "green" : "red"} /></div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      <section className="card mt-6 overflow-hidden p-0">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search assessments" className="input pl-9" />
          </div>
          <select name="assessment" defaultValue={assessment ?? ""} className="input w-auto max-w-56">
            <option value="">All assessments</option>
            {[...new Map(all.map((a) => [a.assessmentId, a.assessment.title])).entries()].map(([id, t]) => (
              <option key={id} value={id}>{t}</option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} className="input w-auto">
            <option value="">All results</option>
            <option value="passed">Passed</option>
            <option value="failed">Not passed</option>
            <option value="progress">In progress</option>
          </select>
          <button className="btn-secondary">Apply</button>
          {(q || status || assessment) && <Link href="/history" className="text-sm text-slate-500 hover:text-slate-900">Clear</Link>}
        </form>

        {filtered.length === 0 ? (
          <EmptyState icon={<History />} title={all.length ? "No attempts match your filters" : "No attempts yet"}>
            {all.length ? "Try clearing the filters." : "Your results will appear here after you complete an assessment."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Assessment</th><th>Attempt</th><th>Date</th><th>Duration</th><th className="min-w-40">Score</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <p className="font-medium">{a.assessment.title}</p>
                      {a.assessment.trainingSession && <p className="text-xs text-slate-500">{a.assessment.trainingSession}</p>}
                    </td>
                    <td className="whitespace-nowrap text-slate-600">#{a.attemptNo}{a.attemptNo > 1 && <span className="badge ml-2 bg-violet-50 text-violet-700 ring-1 ring-violet-200 ring-inset">Retake {a.attemptNo - 1}</span>}</td>
                    <td className="whitespace-nowrap text-slate-600">{fmtDate(a.submittedAt ?? a.startedAt)}</td>
                    <td className="whitespace-nowrap text-slate-600">{fmtDuration(a.startedAt, a.submittedAt)}</td>
                    <td>
                      {a.status === "SUBMITTED" ? (
                        <div>
                          <p className="text-sm font-semibold tabular-nums">{pct(a.percent)} <span className="font-normal text-slate-500">({a.score}/{a.total})</span></p>
                          <div className="mt-1"><ProgressBar value={a.percent ?? 0} tone={a.passed ? "green" : "red"} /></div>
                        </div>
                      ) : "—"}
                    </td>
                    <td><StatusBadge status={a.status} passed={a.passed} /></td>
                    <td className="text-right">
                      <Link className="btn-secondary btn-sm" href={a.status === "SUBMITTED" ? `/attempt/${a.id}/result` : `/attempt/${a.id}`}>
                        <Eye size={14} /> {a.status === "SUBMITTED" ? "Review" : "Resume"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
