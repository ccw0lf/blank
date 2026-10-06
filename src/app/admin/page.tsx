import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  HelpCircle,
  Plus,
  Timer,
  Users,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { fmtDate, fmtDateShort, pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { PublishBadge } from "@/components/StatusBadge";
import { BarChart } from "@/components/Charts";
import { EmptyState } from "@/components/EmptyState";

export default async function AdminDashboard() {
  await finalizeExpired();
  const since = new Date(Date.now() - 13 * 86400_000);
  since.setHours(0, 0, 0, 0);

  const [users, assessments, published, questions, submitted, inProgress, agg, passed, recent, list, passStats, recentAttempts] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.assessment.count(),
      prisma.assessment.count({ where: { isPublished: true } }),
      prisma.question.count({ where: { isActive: true } }),
      prisma.attempt.count({ where: { status: "SUBMITTED" } }),
      prisma.attempt.count({ where: { status: "IN_PROGRESS" } }),
      prisma.attempt.aggregate({ where: { status: "SUBMITTED" }, _avg: { percent: true } }),
      prisma.attempt.count({ where: { status: "SUBMITTED", passed: true } }),
      prisma.attempt.findMany({
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 7,
        include: { user: { select: { name: true } }, assessment: { select: { title: true } } },
      }),
      prisma.assessment.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { _count: { select: { attempts: { where: { status: "SUBMITTED" } }, questions: true } } },
      }),
      prisma.attempt.groupBy({
        by: ["assessmentId"],
        where: { status: "SUBMITTED" },
        _avg: { percent: true },
      }),
      prisma.attempt.findMany({
        where: { status: "SUBMITTED", submittedAt: { gte: since } },
        select: { submittedAt: true },
      }),
    ]);

  const avgMap = new Map(passStats.map((p) => [p.assessmentId, p._avg.percent]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    return { d, key: d.toDateString(), label: fmtDateShort(d), value: 0 };
  });
  for (const a of recentAttempts) {
    const hit = days.find((d) => d.key === a.submittedAt!.toDateString());
    if (hit) hit.value++;
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="Activity across all assessments and participants."
        actions={
          <Link href="/admin/assessments/new" className="btn-primary">
            <Plus size={16} /> New assessment
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Participants" value={users} icon={<Users />} tone="brand" />
        <Stat label="Assessments" value={assessments} icon={<ClipboardList />} tone="violet" hint={`${published} published`} />
        <Stat label="Active questions" value={questions} icon={<HelpCircle />} tone="sky" />
        <Stat label="Submissions" value={submitted} icon={<ClipboardCheck />} tone="green" hint={`${inProgress} in progress`} />
        <Stat label="Average score" value={pct(agg._avg.percent)} icon={<BarChart3 />} tone="amber" />
        <Stat label="Pass rate" value={submitted ? pct((passed / submitted) * 100) : "—"} icon={<Award />} tone="green" hint={`${passed} passed`} />
      </div>

      <section className="card mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Submissions · last 14 days</h2>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><Timer size={14} /> {recentAttempts.length} total</span>
        </div>
        <BarChart data={days.map((d) => ({ label: d.label, value: d.value }))} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-semibold">Assessments</h2>
            <Link href="/admin/assessments" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {list.length === 0 ? (
            <EmptyState icon={<ClipboardList />} title="No assessments yet" action={<Link href="/admin/assessments/new" className="btn-primary btn-sm"><Plus size={14} /> Create one</Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Title</th><th className="num">Submissions</th><th className="num">Avg</th><th>Status</th></tr></thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td><Link href={`/admin/assessments/${a.id}`} className="font-medium hover:text-brand-600">{a.title}</Link></td>
                      <td className="num">{a._count.attempts}</td>
                      <td className="num">{pct(avgMap.get(a.id))}</td>
                      <td><PublishBadge live={a.isPublished} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card overflow-hidden p-0">
          <h2 className="px-5 pt-5 pb-3 font-semibold">Latest submissions</h2>
          {recent.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="No submissions yet">Results will appear here as participants finish.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/attempt/${r.id}/result`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {r.user.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.user.name}</p>
                      <p className="truncate text-xs text-slate-500">{r.assessment.title} · {fmtDate(r.submittedAt)}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${r.passed ? "text-emerald-600" : "text-red-600"}`}>{pct(r.percent)}</span>
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
