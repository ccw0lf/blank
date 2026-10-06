import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { fmtDate, pct } from "@/lib/utils";
import { TopBar } from "@/components/TopBar";
import { Stat } from "@/components/Stat";

export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  await finalizeExpired({ userId: user.id });
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    include: { assessment: { select: { title: true, slug: true, trainingSession: true } } },
    orderBy: { startedAt: "desc" },
  });
  const done = attempts.filter((a) => a.status === "SUBMITTED");
  const avg = done.length ? done.reduce((s, a) => s + (a.percent ?? 0), 0) / done.length : null;

  const links = [{ href: "/dashboard", label: "My results" }];
  if (user.role === "ADMIN") links.push({ href: "/admin", label: "Admin panel" });

  return (
    <>
      <TopBar user={user} links={links} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Hi, {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-slate-600">
          Open the assessment link your trainer shared after the session to take a quiz. Your results show up here.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Assessments taken" value={done.length} />
          <Stat label="Passed" value={done.filter((a) => a.passed).length} />
          <Stat label="Average score" value={pct(avg)} />
          <Stat label="In progress" value={attempts.length - done.length} />
        </div>

        <div className="card mt-6 overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr><th>Assessment</th><th>Attempt</th><th>Date</th><th>Score</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {attempts.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">No attempts yet.</td></tr>
              )}
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium">{a.assessment.title}</p>
                    {a.assessment.trainingSession && <p className="text-xs text-slate-500">{a.assessment.trainingSession}</p>}
                  </td>
                  <td>#{a.attemptNo}</td>
                  <td className="whitespace-nowrap">{fmtDate(a.submittedAt ?? a.startedAt)}</td>
                  <td className="tabular-nums">{a.status === "SUBMITTED" ? `${a.score}/${a.total} (${pct(a.percent)})` : "—"}</td>
                  <td>
                    {a.status !== "SUBMITTED" ? (
                      <span className="badge bg-sky-100 text-sky-800">In progress</span>
                    ) : a.passed ? (
                      <span className="badge bg-emerald-100 text-emerald-800">Passed</span>
                    ) : (
                      <span className="badge bg-red-100 text-red-800">Failed</span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      className="text-brand-600 hover:underline"
                      href={a.status === "SUBMITTED" ? `/attempt/${a.id}/result` : `/attempt/${a.id}`}
                    >
                      {a.status === "SUBMITTED" ? "View result" : "Resume"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
