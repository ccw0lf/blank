import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  History,
  PlayCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { getAssessmentCards } from "@/lib/participant";
import { fmtDate, fmtDateShort, pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { TrendChart } from "@/components/Charts";
import { EmptyState } from "@/components/EmptyState";

export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  await finalizeExpired({ userId: user.id });
  const [attempts, cards] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: user.id },
      include: { assessment: { select: { title: true, passPercent: true } } },
      orderBy: { startedAt: "desc" },
    }),
    getAssessmentCards(user.id),
  ]);

  const done = attempts.filter((a) => a.status === "SUBMITTED");
  const running = attempts.filter((a) => a.status === "IN_PROGRESS");
  const passed = done.filter((a) => a.passed).length;
  const avg = done.length ? done.reduce((s, a) => s + (a.percent ?? 0), 0) / done.length : null;
  const best = done.length ? Math.max(...done.map((a) => a.percent ?? 0)) : null;
  const passRate = done.length ? (passed / done.length) * 100 : null;
  const todo = cards.filter((c) => c.state === "available" || c.state === "retake" || c.state === "in_progress").slice(0, 3);

  const trend = [...done]
    .reverse()
    .slice(-12)
    .map((a) => ({ label: fmtDateShort(a.submittedAt), value: a.percent ?? 0, passed: a.passed }));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Your training assessments, results and progress at a glance."
        actions={
          <Link href="/assessments" className="btn-primary">
            <ClipboardList size={16} /> Browse assessments
          </Link>
        }
      />

      {running.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-sky-700">
              <Clock3 size={20} />
            </span>
            <div>
              <p className="font-medium text-sky-900">
                You have {running.length} assessment{running.length > 1 ? "s" : ""} in progress
              </p>
              <p className="text-sm text-sky-800/80">{running.map((r) => r.assessment.title).join(", ")}</p>
            </div>
          </div>
          <Link href={`/attempt/${running[0].id}`} className="btn-primary">
            <PlayCircle size={16} /> Resume
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Assessments taken" value={done.length} icon={<ClipboardCheck />} tone="brand" hint={`${running.length} in progress`} />
        <Stat label="Passed" value={passed} icon={<CheckCircle2 />} tone="green" hint={done.length ? `${done.length - passed} not passed` : undefined} />
        <Stat label="Average score" value={pct(avg)} icon={<Target />} tone="violet" />
        <Stat label="Best score" value={pct(best)} icon={<Award />} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <TrendingUp size={18} className="text-slate-400" /> Score trend
            </h2>
            <span className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Passed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Not passed</span>
            </span>
          </div>
          {trend.length === 0 ? (
            <EmptyState icon={<TrendingUp />} title="No results yet">Complete an assessment to see your progress here.</EmptyState>
          ) : (
            <TrendChart points={trend} />
          )}
        </section>

        <section className="card flex flex-col items-center justify-center text-center">
          <h2 className="mb-4 self-start font-semibold">Pass rate</h2>
          <ScoreRing value={passRate ?? 0} size={150} stroke={12} passed={passRate == null ? null : passRate >= 50} label="of attempts" />
          <p className="mt-4 text-sm text-slate-600">
            {done.length ? `${passed} of ${done.length} attempts passed` : "Nothing submitted yet"}
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <History size={18} className="text-slate-400" /> Recent results
            </h2>
            <Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {attempts.length === 0 ? (
            <EmptyState icon={<History />} title="No attempts yet">Open the assessment link shared after your training session.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attempts.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.status === "SUBMITTED" ? `/attempt/${a.id}/result` : `/attempt/${a.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.assessment.title}</p>
                      <p className="text-xs text-slate-500">
                        Attempt #{a.attemptNo} · {fmtDate(a.submittedAt ?? a.startedAt)}
                      </p>
                    </div>
                    <span className="w-14 text-right text-sm font-semibold tabular-nums">
                      {a.status === "SUBMITTED" ? pct(a.percent) : "—"}
                    </span>
                    <StatusBadge status={a.status} passed={a.passed} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <ClipboardList size={18} className="text-slate-400" /> To do
            </h2>
            <Link href="/assessments" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              All <ArrowRight size={14} />
            </Link>
          </div>
          {todo.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="You're all caught up">No open assessments right now.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todo.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {c.questionCount} questions{c.durationMinutes ? ` · ${c.durationMinutes} min` : ""}
                    </p>
                  </div>
                  <Link href={c.inProgressId ? `/attempt/${c.inProgressId}` : `/a/${c.slug}`} className="btn-secondary btn-sm">
                    {c.state === "in_progress" ? "Resume" : c.state === "retake" ? "Retake" : "Start"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
