"use client";
import { useActionState } from "react";
import { ArrowRight, Save } from "lucide-react";
import { createAssessmentAction, updateAssessmentAction } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionForm } from "@/components/ActionForm";

type Values = {
  id?: string;
  title?: string;
  description?: string | null;
  trainingSession?: string | null;
  slug?: string;
  questionsPerAttempt?: number;
  durationMinutes?: number | null;
  passPercent?: number;
  maxRetakes?: number | null;
  shuffleOptions?: boolean;
  showReview?: boolean;
  isPublished?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export function AssessmentForm({ initial, poolSize }: { initial?: Values; poolSize?: number }) {
  const editing = !!initial?.id;
  const [state, action] = useActionState(editing ? updateAssessmentAction : createAssessmentAction, undefined);
  const v = initial ?? {};
  return (
    <ActionForm action={action} className="space-y-6">
      {editing && <input type="hidden" name="id" value={v.id} />}
      <section className="card space-y-4">
        <h2 className="font-semibold">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label" htmlFor="title">Title *</label>
            <input id="title" name="title" className="input" required defaultValue={v.title} placeholder="IT General Controls – Post-training quiz" />
          </div>
          <div>
            <label className="label" htmlFor="trainingSession">Training session</label>
            <input id="trainingSession" name="trainingSession" className="input" defaultValue={v.trainingSession ?? ""} placeholder="ITGC Workshop – 12 Oct 2026" />
          </div>
          <div>
            <label className="label" htmlFor="slug">Link slug</label>
            <input id="slug" name="slug" className="input font-mono" defaultValue={v.slug} placeholder="auto from title" />
            <p className="mt-1 text-xs text-slate-500">The share link will be /a/&lt;slug&gt;</p>
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="description">Instructions / description</label>
            <textarea id="description" name="description" rows={3} className="input" defaultValue={v.description ?? ""} />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Rules</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="label" htmlFor="qpa">Questions per student *</label>
            <input id="qpa" name="questionsPerAttempt" type="number" min={1} className="input" required defaultValue={v.questionsPerAttempt ?? 10} />
            {poolSize !== undefined && <p className="mt-1 text-xs text-slate-500">Pool has {poolSize} active question(s)</p>}
          </div>
          <div>
            <label className="label" htmlFor="dur">Time limit (minutes)</label>
            <input id="dur" name="durationMinutes" type="number" min={0} className="input" defaultValue={v.durationMinutes ?? ""} placeholder="No limit" />
          </div>
          <div>
            <label className="label" htmlFor="pass">Pass mark (%) *</label>
            <input id="pass" name="passPercent" type="number" min={0} max={100} className="input" required defaultValue={v.passPercent ?? 60} />
          </div>
          <div>
            <label className="label" htmlFor="max">Retakes allowed</label>
            <input id="max" name="maxRetakes" type="number" min={0} className="input" defaultValue={editing ? (v.maxRetakes ?? "") : (v.maxRetakes ?? 1)} placeholder="Unlimited" />
            <p className="mt-1 text-xs text-slate-500">Blank = unlimited · 0 = no retakes · 2 = up to 2 retakes after the first attempt</p>
          </div>
          <div>
            <label className="label" htmlFor="startsAt">Opens at</label>
            <input id="startsAt" name="startsAt" type="datetime-local" className="input" defaultValue={v.startsAt ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="endsAt">Closes at</label>
            <input id="endsAt" name="endsAt" type="datetime-local" className="input" defaultValue={v.endsAt ?? ""} />
          </div>
        </div>
        <div className="space-y-2 pt-2 text-sm">
          <Check name="shuffleOptions" defaultChecked={v.shuffleOptions ?? true} label="Shuffle answer options for each student" />
          <Check name="showReview" defaultChecked={v.showReview ?? true} label="Show correct answers & explanations to students after they submit" />
          <Check name="isPublished" defaultChecked={v.isPublished ?? false} label="Published (students can open the link)" />
        </div>
      </section>

      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{editing ? <><Save size={16} /> Save settings</> : <>Create &amp; add questions <ArrowRight size={16} /></>}</SubmitButton>
    </ActionForm>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
      {label}
    </label>
  );
}
