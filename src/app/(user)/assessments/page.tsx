import Link from "next/link";
import { Ban, CheckCircle2, ClipboardList, Clock, HelpCircle, PlayCircle, RotateCcw, Target, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { finalizeExpired } from "@/lib/quiz";
import { getAssessmentCards, type AssessmentCard } from "@/lib/participant";
import { pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/Charts";

function action(c: AssessmentCard) {
  switch (c.state) {
    case "in_progress":
      return <Link href={`/attempt/${c.inProgressId}`} className="btn-primary w-full"><PlayCircle size={16} /> Resume</Link>;
    case "available":
      return <Link href={`/a/${c.slug}`} className="btn-primary w-full"><PlayCircle size={16} /> Start assessment</Link>;
    case "retake":
      return <Link href={`/a/${c.slug}`} className="btn-secondary w-full"><RotateCcw size={16} /> Retake{c.retakesLeft !== null ? ` (${c.retakesLeft} left)` : ""}</Link>;
    case "completed":
      return c.lastAttemptId ? <Link href={`/attempt/${c.lastAttemptId}/result`} className="btn-secondary w-full"><Trophy size={16} /> View result</Link> : null;
    default:
      return <span className="btn-secondary w-full cursor-not-allowed opacity-60"><Ban size={16} /> Unavailable</span>;
  }
}

export default async function AssessmentsPage() {
  const user = await requireUser("/assessments");
  await finalizeExpired({ userId: user.id });
  const cards = await getAssessmentCards(user.id);
  const open = cards.filter((c) => c.state === "available" || c.state === "retake" || c.state === "in_progress");
  const rest = cards.filter((c) => !open.includes(c));

  const Card = ({ c }: { c: AssessmentCard }) => (
    <div className="card flex flex-col">
      <div className="flex-1">
        {c.trainingSession && <p className="text-xs font-medium text-brand-600">{c.trainingSession}</p>}
        <h3 className="mt-0.5 font-semibold text-slate-900">{c.title}</h3>
        {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
        <ul className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <li className="flex items-center gap-1.5"><HelpCircle size={14} className="text-slate-400" />{c.questionCount} Qs</li>
          <li className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{c.durationMinutes ? `${c.durationMinutes} min` : "No limit"}</li>
          <li className="flex items-center gap-1.5"><Target size={14} className="text-slate-400" />Pass {c.passPercent}%</li>
        </ul>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><RotateCcw size={12} /> Retakes: {c.retakesAllowed === null ? `${c.retakesTaken} taken · unlimited` : c.retakesAllowed === 0 ? "not allowed" : `${c.retakesTaken} of ${c.retakesAllowed} used`}</span>
            {c.best != null && <span className={c.passed ? "font-medium text-emerald-600" : "font-medium text-slate-700"}>Best {pct(c.best)}</span>}
          </div>
          <ProgressBar value={c.best ?? 0} tone={c.best == null ? "brand" : c.passed ? "green" : "red"} />
        </div>
        {c.closedReason && c.state === "closed" && <p className="mt-3 text-xs text-amber-700">{c.closedReason}</p>}
        {c.passed && <p className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> You passed this assessment</p>}
      </div>
      <div className="mt-5">{action(c)}</div>
    </div>
  );

  return (
    <>
      <PageHeader title="Assessments" description="Quizzes released after your training sessions." />
      {cards.length === 0 ? (
        <div className="card p-0"><EmptyState icon={<ClipboardList />} title="No assessments available">When your trainer publishes an assessment, it will show up here.</EmptyState></div>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Open for you</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{open.map((c) => <Card key={c.id} c={c} />)}</div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Completed &amp; closed</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rest.map((c) => <Card key={c.id} c={c} />)}</div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
