import { prisma } from "@/lib/db";
import { AssessmentForm } from "@/components/AssessmentForm";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteAssessmentAction, duplicateAssessmentAction } from "@/app/actions/admin";

// datetime-local wants local time "YYYY-MM-DDTHH:mm"
function toLocalInput(d: Date | null) {
  if (!d) return null;
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await prisma.assessment.findUniqueOrThrow({ where: { id } });
  const pool = await prisma.question.count({ where: { assessmentId: id, isActive: true } });
  return (
    <div className="max-w-4xl space-y-6">
      <AssessmentForm
        poolSize={pool}
        initial={{ ...a, startsAt: toLocalInput(a.startsAt), endsAt: toLocalInput(a.endsAt) }}
      />
      <section className="card space-y-4">
        <h2 className="font-semibold">More actions</h2>
        <div className="flex flex-wrap gap-3">
          <form action={duplicateAssessmentAction}>
            <input type="hidden" name="id" value={a.id} />
            <SubmitButton className="btn-secondary">Duplicate for a new session</SubmitButton>
          </form>
          <form action={deleteAssessmentAction}>
            <input type="hidden" name="id" value={a.id} />
            <SubmitButton className="btn-danger" confirm="Delete this assessment, all its questions and all results? This cannot be undone.">
              Delete assessment
            </SubmitButton>
          </form>
        </div>
        <p className="text-xs text-slate-500">Duplicating copies all settings and questions into a new draft with a new link, which is useful when you run the same training again.</p>
      </section>
    </div>
  );
}
