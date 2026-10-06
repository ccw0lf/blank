import Link from "next/link";
import { ClipboardList, Plus, Settings2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import { fmtDate } from "@/lib/utils";
import { CopyLink } from "@/components/CopyLink";
import { PageHeader } from "@/components/PageHeader";
import { PublishBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default async function AssessmentsPage() {
  const base = await baseUrl();
  const list = await prisma.assessment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: { where: { isActive: true } }, attempts: { where: { status: "SUBMITTED" } } } },
    },
  });
  return (
    <>
      <PageHeader
        title="Assessments"
        description="Create quizzes, manage question banks and share links with participants."
        actions={<Link href="/admin/assessments/new" className="btn-primary"><Plus size={16} /> New assessment</Link>}
      />
      <div className="card overflow-hidden p-0">
        {list.length === 0 ? (
          <EmptyState icon={<ClipboardList />} title="No assessments yet" action={<Link href="/admin/assessments/new" className="btn-primary"><Plus size={16} /> Create your first assessment</Link>}>
            Create an assessment, add a question bank and share the link after your training session.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Assessment</th><th className="num">Pool → per student</th><th className="num">Submissions</th><th>Created</th><th>Status</th><th className="act"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/admin/assessments/${a.id}`} className="font-medium hover:text-brand-600">{a.title}</Link>
                      {a.trainingSession && <p className="text-xs text-slate-500">{a.trainingSession}</p>}
                    </td>
                    <td className="num">
                      {a._count.questions} → {a.questionsPerAttempt}
                      {a._count.questions < a.questionsPerAttempt && <span className="badge ml-2 bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset">pool too small</span>}
                    </td>
                    <td className="num">{a._count.attempts}</td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(a.createdAt)}</td>
                    <td><PublishBadge live={a.isPublished} /></td>
                    <td className="act">
                      <div className="flex justify-end gap-2">
                        <CopyLink compact url={`${base}/a/${a.slug}`} />
                        <Link href={`/admin/assessments/${a.id}`} className="btn-secondary btn-sm"><Settings2 size={14} /> Manage</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
