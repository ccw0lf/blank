import { Award, BarChart3, CheckCircle2, Dices, Settings2, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { finalizeExpired } from "@/lib/quiz";
import { combinations } from "@/lib/engine";
import { fmtDate, pct } from "@/lib/utils";
import { Stat } from "@/components/Stat";
import { BarChart } from "@/components/Charts";
import { EnginePanel } from "./EnginePanel";

export default async function AssessmentOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await finalizeExpired({ assessmentId: id });
  const a = await prisma.assessment.findUniqueOrThrow({ where: { id } });
  const [pool, submitted, inProgress, agg, passed, participants, topics, retakes] = await Promise.all([
    prisma.question.count({ where: { assessmentId: id, isActive: true } }),
    prisma.attempt.count({ where: { assessmentId: id, status: "SUBMITTED" } }),
    prisma.attempt.count({ where: { assessmentId: id, status: "IN_PROGRESS" } }),
    prisma.attempt.aggregate({
      where: { assessmentId: id, status: "SUBMITTED" },
      _avg: { percent: true },
      _max: { percent: true },
      _min: { percent: true },
    }),
    prisma.attempt.count({ where: { assessmentId: id, status: "SUBMITTED", passed: true } }),
    prisma.attempt.groupBy({ by: ["userId"], where: { assessmentId: id } }),
    prisma.question.groupBy({ by: ["topic"], where: { assessmentId: id, isActive: true }, _count: { _all: true } }),
    prisma.attempt.count({ where: { assessmentId: id, attemptNo: { gt: 1 } } }),
  ]);

  const k = a.questionsPerAttempt;
  const combos = combinations(pool, k);
  const scores = await prisma.attempt.findMany({
    where: { assessmentId: id, status: "SUBMITTED" },
    select: { percent: true },
  });
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i === 9 ? 100 : i * 10 + 9}`,
    n: scores.filter((s) => Math.min(9, Math.floor((s.percent ?? 0) / 10)) === i).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Participants" value={participants.length} icon={<Users />} tone="brand" hint={`${inProgress} currently taking it`} />
        <Stat label="Submissions" value={submitted} icon={<CheckCircle2 />} tone="green" hint={`${retakes} retake${retakes === 1 ? "" : "s"} taken`} />
        <Stat label="Average score" value={pct(agg._avg.percent)} icon={<BarChart3 />} tone="violet" hint={submitted ? `min ${pct(agg._min.percent)} · max ${pct(agg._max.percent)}` : undefined} />
        <Stat label="Pass rate" value={submitted ? pct((passed / submitted) * 100) : "—"} icon={<Award />} tone="amber" hint={`pass mark ${a.passPercent}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Score distribution</h2>
          {submitted === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <div className="mt-4">
              <BarChart
                data={buckets.map((b) => ({
                  label: `${b.label.split("–")[0]}%`,
                  value: b.n,
                  title: `${b.label}%: ${b.n}`,
                  barClass: parseInt(b.label) + 9 >= a.passPercent ? "bg-emerald-500" : "bg-red-400",
                }))}
              />
            </div>
          )}
        </section>

        <section className="card space-y-3 text-sm">
          <h2 className="flex items-center gap-2 font-semibold"><Settings2 size={18} className="text-slate-400" /> Configuration</h2>
          <Row k="Questions per student" v={`${k} of ${pool} active in the pool`} />
          <Row k="Time limit" v={a.durationMinutes ? `${a.durationMinutes} minutes` : "None"} />
          <Row k="Retakes allowed" v={a.maxRetakes === null ? "Unlimited" : a.maxRetakes === 0 ? "None" : `${a.maxRetakes} per student`} />
          <Row k="Opens / closes" v={`${fmtDate(a.startsAt)} → ${fmtDate(a.endsAt)}`} />
          <Row k="Shuffle options" v={a.shuffleOptions ? "Yes" : "No"} />
          <Row k="Show correct answers to students" v={a.showReview ? "Yes" : "No"} />
        </section>
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Dices size={18} className="text-slate-400" /> Randomization engine</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each student gets <b>{Math.min(k, pool)}</b> questions from the pool of <b>{pool}</b>. The engine picks the
            least-used questions first (so students next to each other get mostly different papers), spreads picks
            across topics, never gives two students the exact same set, and shuffles question and option order.
          </p>
        </div>
        {pool < k ? (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200 ring-inset">
            The pool has only {pool} active question(s) but {k} are required per student. Students will get all {pool}. Add more questions.
          </p>
        ) : pool === k ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
            Pool size equals questions per student, so every student gets the same questions (only the order changes). Add more questions to get different sets.
          </p>
        ) : (
          <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200 ring-inset">
            {combos === Infinity ? "More than 9 quadrillion" : combos.toLocaleString()} different question sets are possible.
          </p>
        )}
        {topics.length > 1 && (
          <p className="text-sm text-slate-600">
            Topics: {topics.map((t) => `${t.topic ?? "Untagged"} (${t._count._all})`).join(" · ")}
          </p>
        )}
        <EnginePanel assessmentId={id} />
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
