import Link from "next/link";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import { fmtDate } from "@/lib/utils";
import { CopyLink } from "@/components/CopyLink";

export default async function AssessmentsPage() {
  const base = await baseUrl();
  const list = await prisma.assessment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { questions: { where: { isActive: true } }, attempts: { where: { status: "SUBMITTED" } } },
      },
    },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <Link href="/admin/assessments/new" className="btn-primary">+ New assessment</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr><th>Title</th><th>Pool → per student</th><th>Submissions</th><th>Created</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-slate-500">No assessments yet. Create your first one.</td></tr>
            )}
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/admin/assessments/${a.id}`} className="font-medium hover:text-brand-600">{a.title}</Link>
                  {a.trainingSession && <p className="text-xs text-slate-500">{a.trainingSession}</p>}
                </td>
                <td className="tabular-nums">
                  {a._count.questions} → {a.questionsPerAttempt}
                  {a._count.questions < a.questionsPerAttempt && <span className="badge ml-2 bg-amber-100 text-amber-800">pool too small</span>}
                </td>
                <td className="tabular-nums">{a._count.attempts}</td>
                <td className="whitespace-nowrap text-slate-500">{fmtDate(a.createdAt)}</td>
                <td>{a.isPublished ? <span className="badge bg-emerald-100 text-emerald-800">Live</span> : <span className="badge bg-slate-100 text-slate-600">Draft</span>}</td>
                <td className="text-right"><CopyLink compact url={`${base}/a/${a.slug}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
