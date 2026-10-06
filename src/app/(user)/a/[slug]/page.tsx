import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarClock, ClipboardList, Clock, History, ListChecks, PlayCircle, RotateCcw, Shuffle, Target, Timer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { availability, fmtDate, pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StartForm } from "./StartForm";

export default async function AssessmentLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/a/${slug}`);
  const assessment = await prisma.assessment.findUnique({
    where: { slug },
    include: { _count: { select: { questions: { where: { isActive: true } } } } },
  });
  if (!assessment || (!assessment.isPublished && user.role !== "ADMIN")) notFound();

  await finalizeExpired({ userId: user.id, assessmentId: assessment.id });
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, assessmentId: assessment.id },
    orderBy: { attemptNo: "desc" },
  });
  const inProgress = attempts.find((a) => a.status === "IN_PROGRESS");
  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const used = attempts.length;
  const left = assessment.maxAttempts - used;
  const avail = availability(assessment);
  const qCount = Math.min(assessment.questionsPerAttempt, assessment._count.questions);

  const facts = [
    { icon: ListChecks, label: "Questions", value: qCount },
    { icon: Timer, label: "Time limit", value: assessment.durationMinutes ? `${assessment.durationMinutes} min` : "None" },
    { icon: Target, label: "Pass mark", value: `${assessment.passPercent}%` },
    { icon: RotateCcw, label: "Attempts left", value: Math.max(0, left) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/assessments", label: "All assessments" }}
        eyebrow={assessment.trainingSession}
        title={assessment.title}
        description={assessment.description}
      />

      <div className="card">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-lg bg-slate-50 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500"><f.icon size={14} /> {f.label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
          <li className="flex gap-2.5"><Shuffle size={16} className="mt-0.5 shrink-0 text-brand-600" /> Each participant receives a different randomized set of questions.</li>
          <li className="flex gap-2.5"><ClipboardList size={16} className="mt-0.5 shrink-0 text-brand-600" /> Your answers are saved automatically as you go.</li>
          {assessment.durationMinutes && (
            <li className="flex gap-2.5"><Clock size={16} className="mt-0.5 shrink-0 text-brand-600" /> The timer starts when you click start, and the test auto-submits when time runs out.</li>
          )}
          {assessment.endsAt && (
            <li className="flex gap-2.5"><CalendarClock size={16} className="mt-0.5 shrink-0 text-brand-600" /> Closes on {fmtDate(assessment.endsAt)}.</li>
          )}
        </ul>

        <div className="mt-8 border-t border-slate-100 pt-6">
          {inProgress ? (
            <Link href={`/attempt/${inProgress.id}`} className="btn-primary"><PlayCircle size={16} /> Resume assessment</Link>
          ) : !avail.open ? (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800"><Ban size={16} /> {avail.reason}</p>
          ) : left <= 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700"><Ban size={16} /> You have used all your attempts.</p>
          ) : qCount === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800"><Ban size={16} /> No questions have been added yet.</p>
          ) : (
            <StartForm assessmentId={assessment.id} label={used ? "Start new attempt" : "Start assessment"} />
          )}
        </div>
      </div>

      {submitted.length > 0 && (
        <section className="card mt-6 overflow-hidden p-0">
          <h2 className="flex items-center gap-2 px-5 pt-5 pb-3 font-semibold"><History size={18} className="text-slate-400" /> Your previous attempts</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>#</th><th>Submitted</th><th>Score</th><th>Result</th><th /></tr></thead>
              <tbody>
                {submitted.map((a) => (
                  <tr key={a.id}>
                    <td>{a.attemptNo}</td>
                    <td className="whitespace-nowrap">{fmtDate(a.submittedAt)}</td>
                    <td className="tabular-nums">{a.score}/{a.total} ({pct(a.percent)})</td>
                    <td><StatusBadge status={a.status} passed={a.passed} /></td>
                    <td className="text-right"><Link className="font-medium text-brand-600 hover:underline" href={`/attempt/${a.id}/result`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
