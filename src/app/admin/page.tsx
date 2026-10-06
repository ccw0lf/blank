import Link from "next/link";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { fmtDate, pct } from "@/lib/utils";
import { Stat } from "@/components/Stat";

export default async function AdminDashboard() {
  await finalizeExpired();
  const [users, assessments, published, questions, submitted, inProgress, agg, passed, recent, perAssessment] =
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
        take: 8,
        include: { user: { select: { name: true, email: true } }, assessment: { select: { title: true } } },
      }),
      prisma.assessment.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { _count: { select: { attempts: { where: { status: "SUBMITTED" } }, questions: true } } },
      }),
    ]);

  const passStats = await prisma.attempt.groupBy({
    by: ["assessmentId"],
    where: { status: "SUBMITTED" },
    _avg: { percent: true },
    _count: { _all: true },
  });
  const passMap = new Map(passStats.map((p) => [p.assessmentId, p]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600">Overview of all assessments and participants.</p>
        </div>
        <Link href="/admin/assessments/new" className="btn-primary">+ New assessment</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Participants" value={users} />
        <Stat label="Assessments" value={assessments} hint={`${published} published`} />
        <Stat label="Active questions" value={questions} />
        <Stat label="Submissions" value={submitted} hint={`${inProgress} in progress`} />
        <Stat label="Average score" value={pct(agg._avg.percent)} />
        <Stat label="Pass rate" value={submitted ? pct((passed / submitted) * 100) : "—"} hint={`${passed} passed`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-x-auto p-0">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-semibold">Assessments</h2>
            <Link href="/admin/assessments" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <table className="table">
            <thead><tr><th>Title</th><th>Subs.</th><th>Avg</th><th>Status</th></tr></thead>
            <tbody>
              {perAssessment.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No assessments yet.</td></tr>}
              {perAssessment.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/assessments/${a.id}`} className="font-medium hover:text-brand-600">{a.title}</Link></td>
                  <td className="tabular-nums">{a._count.attempts}</td>
                  <td className="tabular-nums">{pct(passMap.get(a.id)?._avg.percent)}</td>
                  <td>{a.isPublished ? <span className="badge bg-emerald-100 text-emerald-800">Live</span> : <span className="badge bg-slate-100 text-slate-600">Draft</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card overflow-x-auto p-0">
          <h2 className="px-5 pt-5 pb-3 font-semibold">Latest submissions</h2>
          <table className="table">
            <thead><tr><th>Participant</th><th>Assessment</th><th>Score</th><th>When</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No submissions yet.</td></tr>}
              {recent.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/attempt/${r.id}/result`} className="font-medium hover:text-brand-600">{r.user.name}</Link></td>
                  <td className="text-slate-600">{r.assessment.title}</td>
                  <td className={r.passed ? "text-emerald-700" : "text-red-700"}>{pct(r.percent)}</td>
                  <td className="whitespace-nowrap text-slate-500">{fmtDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
