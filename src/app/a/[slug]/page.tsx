import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { availability, fmtDate, pct } from "@/lib/utils";
import { TopBar } from "@/components/TopBar";
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
  const used = attempts.length;
  const left = assessment.maxAttempts - used;
  const avail = availability(assessment);
  const qCount = Math.min(assessment.questionsPerAttempt, assessment._count.questions);

  return (
    <>
      <TopBar user={user} links={[{ href: "/dashboard", label: "My results" }]} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="card p-8">
          {assessment.trainingSession && (
            <p className="text-sm font-medium text-brand-600">{assessment.trainingSession}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold">{assessment.title}</h1>
          {assessment.description && <p className="mt-2 whitespace-pre-line text-slate-600">{assessment.description}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Info label="Questions" value={qCount} />
            <Info label="Time limit" value={assessment.durationMinutes ? `${assessment.durationMinutes} min` : "None"} />
            <Info label="Pass mark" value={`${assessment.passPercent}%`} />
            <Info label="Attempts left" value={Math.max(0, left)} />
          </dl>

          <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Each participant receives a different randomized set of questions.</li>
            <li>Your answers are saved automatically as you go.</li>
            {assessment.durationMinutes && <li>The timer starts when you click start, and the test auto-submits when time runs out.</li>}
          </ul>

          <div className="mt-8">
            {inProgress ? (
              <Link href={`/attempt/${inProgress.id}`} className="btn-primary">Resume assessment</Link>
            ) : !avail.open ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{avail.reason}</p>
            ) : left <= 0 ? (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">You have used all your attempts.</p>
            ) : qCount === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No questions have been added yet.</p>
            ) : (
              <StartForm assessmentId={assessment.id} label={used ? "Start new attempt" : "Start assessment"} />
            )}
          </div>
        </div>

        {attempts.some((a) => a.status === "SUBMITTED") && (
          <div className="card mt-6">
            <h2 className="mb-3 font-semibold">Your previous attempts</h2>
            <table className="table">
              <thead><tr><th>#</th><th>Submitted</th><th>Score</th><th>Result</th><th /></tr></thead>
              <tbody>
                {attempts.filter((a) => a.status === "SUBMITTED").map((a) => (
                  <tr key={a.id}>
                    <td>{a.attemptNo}</td>
                    <td>{fmtDate(a.submittedAt)}</td>
                    <td>{a.score}/{a.total} ({pct(a.percent)})</td>
                    <td>{a.passed ? <span className="badge bg-emerald-100 text-emerald-800">Passed</span> : <span className="badge bg-red-100 text-red-800">Failed</span>}</td>
                    <td><Link className="text-brand-600 hover:underline" href={`/attempt/${a.id}/result`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
