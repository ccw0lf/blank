import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import { togglePublishAction } from "@/app/actions/admin";
import { CopyLink } from "@/components/CopyLink";
import { SubmitButton } from "@/components/SubmitButton";
import { Tabs } from "./Tabs";

export default async function AssessmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await prisma.assessment.findUnique({
    where: { id },
    include: { _count: { select: { questions: true, attempts: { where: { status: "SUBMITTED" } } } } },
  });
  if (!a) notFound();
  const url = `${await baseUrl()}/a/${a.slug}`;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/assessments" className="text-sm text-slate-500 hover:text-slate-800">← All assessments</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-semibold">
              {a.title}
              {a.isPublished ? <span className="badge bg-emerald-100 text-emerald-800">Live</span> : <span className="badge bg-slate-100 text-slate-600">Draft</span>}
            </h1>
            {a.trainingSession && <p className="text-sm text-slate-600">{a.trainingSession}</p>}
          </div>
          <form action={togglePublishAction}>
            <input type="hidden" name="id" value={a.id} />
            <SubmitButton className={a.isPublished ? "btn-secondary" : "btn-primary"}>
              {a.isPublished ? "Unpublish" : "Publish"}
            </SubmitButton>
          </form>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Share this link with participants</p>
          <CopyLink url={url} />
          {!a.isPublished && <p className="mt-1 text-xs text-amber-700">Publish the assessment so participants can open the link.</p>}
        </div>
      </div>
      <Tabs id={a.id} counts={{ questions: a._count.questions, results: a._count.attempts }} />
      {children}
    </div>
  );
}
