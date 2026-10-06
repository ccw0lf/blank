import { notFound } from "next/navigation";
import { EyeOff, Globe } from "lucide-react";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import { togglePublishAction } from "@/app/actions/admin";
import { CopyLink } from "@/components/CopyLink";
import { PageHeader } from "@/components/PageHeader";
import { PublishBadge } from "@/components/StatusBadge";
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
        <PageHeader
          back={{ href: "/admin/assessments", label: "All assessments" }}
          eyebrow={a.trainingSession}
          title={
            <span className="flex flex-wrap items-center gap-3">
              {a.title} <PublishBadge live={a.isPublished} />
            </span>
          }
          actions={
            <form action={togglePublishAction}>
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton className={a.isPublished ? "btn-secondary" : "btn-primary"}>
                {a.isPublished ? <><EyeOff size={16} /> Unpublish</> : <><Globe size={16} /> Publish</>}
              </SubmitButton>
            </form>
          }
        />
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Share link</p>
          <div className="min-w-64 flex-1"><CopyLink url={url} /></div>
          {!a.isPublished && <p className="text-xs text-amber-700">Publish so participants can open it.</p>}
        </div>
      </div>
      <Tabs id={a.id} counts={{ questions: a._count.questions, results: a._count.attempts }} />
      {children}
    </div>
  );
}
