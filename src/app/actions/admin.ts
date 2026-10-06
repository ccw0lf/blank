"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseQuestionCsv } from "@/lib/csv";
import { simulate } from "@/lib/engine";
import { parseOptions, slugify } from "@/lib/utils";
import type { FormState } from "@/components/FormMessage";

/* ----------------------------- Assessments ----------------------------- */

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !isNaN(d.getTime()), "Invalid date.");

const assessmentSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
    description: z.string().trim().max(5000).optional(),
    trainingSession: z.string().trim().max(200).optional(),
    slug: z.string().trim().optional(),
    questionsPerAttempt: z.coerce.number().int().min(1, "At least 1 question per attempt.").max(500),
    durationMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    passPercent: z.coerce.number().int().min(0).max(100),
    maxRetakes: z.coerce.number().int().min(0, "Retakes can't be negative.").max(1000).optional(),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, "Close time must be after open time.");

function readAssessment(fd: FormData) {
  const raw = Object.fromEntries(fd) as Record<string, string>;
  const parsed = assessmentSchema.safeParse({ ...raw, durationMinutes: raw.durationMinutes || undefined, maxRetakes: raw.maxRetakes?.trim() ? raw.maxRetakes : undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  return {
    data: {
      title: d.title,
      description: d.description || null,
      trainingSession: d.trainingSession || null,
      questionsPerAttempt: d.questionsPerAttempt,
      durationMinutes: d.durationMinutes || null,
      passPercent: d.passPercent,
      maxRetakes: d.maxRetakes ?? null, // blank = unlimited
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      shuffleOptions: fd.get("shuffleOptions") === "on",
      showReview: fd.get("showReview") === "on",
      isPublished: fd.get("isPublished") === "on",
    },
    slug: slugify(d.slug || d.title),
  } as const;
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = base || "assessment";
  let slug = root;
  for (let i = 2; ; i++) {
    const hit = await prisma.assessment.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
}

export async function createAssessmentAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const r = readAssessment(fd);
  if ("error" in r) return { error: r.error };
  const a = await prisma.assessment.create({ data: { ...r.data, slug: await uniqueSlug(r.slug) } });
  redirect(`/admin/assessments/${a.id}/questions?created=1`);
}

export async function updateAssessmentAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(fd.get("id"));
  const r = readAssessment(fd);
  if ("error" in r) return { error: r.error };
  await prisma.assessment.update({ where: { id }, data: { ...r.data, slug: await uniqueSlug(r.slug, id) } });
  revalidatePath(`/admin/assessments/${id}`);
  return { success: "Settings saved." };
}

export async function togglePublishAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const a = await prisma.assessment.findUniqueOrThrow({ where: { id } });
  await prisma.assessment.update({ where: { id }, data: { isPublished: !a.isPublished } });
  revalidatePath("/admin", "layout");
}

export async function deleteAssessmentAction(fd: FormData) {
  await requireAdmin();
  await prisma.assessment.delete({ where: { id: String(fd.get("id")) } });
  revalidatePath("/admin", "layout");
  redirect("/admin/assessments");
}

export async function duplicateAssessmentAction(fd: FormData) {
  await requireAdmin();
  const src = await prisma.assessment.findUniqueOrThrow({
    where: { id: String(fd.get("id")) },
    include: { questions: true },
  });
  const copy = await prisma.assessment.create({
    data: {
      title: `${src.title} (copy)`,
      description: src.description,
      trainingSession: src.trainingSession,
      slug: await uniqueSlug(slugify(`${src.slug}-copy`)),
      questionsPerAttempt: src.questionsPerAttempt,
      durationMinutes: src.durationMinutes,
      passPercent: src.passPercent,
      maxRetakes: src.maxRetakes,
      shuffleOptions: src.shuffleOptions,
      showReview: src.showReview,
      isPublished: false,
      questions: {
        create: src.questions.map((q) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          topic: q.topic,
          isActive: q.isActive,
        })),
      },
    },
  });
  redirect(`/admin/assessments/${copy.id}`);
}

/* ------------------------------ Questions ------------------------------ */

const questionSchema = z.object({
  text: z.string().trim().min(3, "Question text is required.").max(5000),
  explanation: z.string().trim().max(5000).optional(),
  topic: z.string().trim().max(100).optional(),
  correct: z.coerce.number().int().min(0, "Select the correct answer."),
});

function readQuestion(fd: FormData) {
  const parsed = questionSchema.safeParse({
    text: fd.get("text"),
    explanation: fd.get("explanation") ?? undefined,
    topic: fd.get("topic") ?? undefined,
    correct: fd.get("correct") ?? -1,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;

  // Keep the chosen option pointing at the right text after dropping blanks.
  const raw = fd.getAll("option").map((o) => String(o).trim());
  const options: string[] = [];
  let correctIndex = -1;
  raw.forEach((o, i) => {
    if (!o) return;
    if (i === parsed.data.correct) correctIndex = options.length;
    options.push(o);
  });
  if (options.length < 2) return { error: "Add at least 2 options." } as const;
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
    return { error: "Options must be different from each other." } as const;
  if (correctIndex < 0) return { error: "The correct answer must be one of the filled-in options." } as const;
  return {
    data: {
      text: parsed.data.text,
      options: JSON.stringify(options),
      correctIndex,
      explanation: parsed.data.explanation || null,
      topic: parsed.data.topic || null,
    },
  } as const;
}

export async function saveQuestionAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const assessmentId = String(fd.get("assessmentId"));
  const questionId = fd.get("questionId") ? String(fd.get("questionId")) : null;
  const r = readQuestion(fd);
  if ("error" in r) return { error: r.error };
  if (questionId) {
    // Editing changes the answer key for future grading only; past attempts keep their stored result.
    await prisma.question.update({ where: { id: questionId, assessmentId }, data: r.data });
  } else {
    await prisma.question.create({ data: { ...r.data, assessmentId } });
  }
  revalidatePath(`/admin/assessments/${assessmentId}`, "layout");
  return { success: questionId ? "Question updated." : "Question added." };
}

export async function toggleQuestionAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const q = await prisma.question.findUniqueOrThrow({ where: { id } });
  await prisma.question.update({ where: { id }, data: { isActive: !q.isActive } });
  revalidatePath(`/admin/assessments/${q.assessmentId}`, "layout");
}

export async function deleteQuestionAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const q = await prisma.question.findUniqueOrThrow({ where: { id }, include: { _count: { select: { served: true } } } });
  if (q._count.served > 0) {
    // Keep history intact: retire instead of deleting a question students have already seen.
    await prisma.question.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.question.delete({ where: { id } });
  }
  revalidatePath(`/admin/assessments/${q.assessmentId}`, "layout");
}

export async function uploadQuestionsAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const assessmentId = String(fd.get("assessmentId"));
  const file = fd.get("file");
  let text = String(fd.get("csv") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2_000_000) return { error: "File is too large (max 2 MB)." };
    text = await file.text();
  }
  if (!text.trim()) return { error: "Choose a CSV file or paste CSV text." };

  const { questions, errors } = parseQuestionCsv(text);
  if (errors.length && fd.get("skipInvalid") !== "on")
    return { error: `Nothing was imported. Fix these rows (or tick "skip invalid rows"):\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n…and ${errors.length - 10} more` : ""}` };
  if (!questions.length) return { error: errors.join("\n") || "No questions found." };

  // Skip exact duplicates of questions already in this assessment.
  const existing = await prisma.question.findMany({ where: { assessmentId }, select: { text: true } });
  const seen = new Set(existing.map((q) => q.text.trim().toLowerCase()));
  const fresh = questions.filter((q) => {
    const key = q.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await prisma.question.createMany({
    data: fresh.map((q) => ({ ...q, options: JSON.stringify(q.options), assessmentId })),
  });
  revalidatePath(`/admin/assessments/${assessmentId}`, "layout");
  const dupes = questions.length - fresh.length;
  return {
    success: `Imported ${fresh.length} question(s).${dupes ? ` Skipped ${dupes} duplicate(s).` : ""}${errors.length ? ` Skipped ${errors.length} invalid row(s).` : ""}`,
  };
}

/* ----------------------------- Engine tools ---------------------------- */

export async function simulateAction(assessmentId: string, students: number) {
  await requireAdmin();
  const a = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  const pool = await prisma.question.findMany({
    where: { assessmentId, isActive: true },
    select: { id: true, topic: true, options: true },
  });
  const k = Math.min(a.questionsPerAttempt, pool.length);
  if (!k) return { error: "Add some active questions first." };
  const n = Math.max(2, Math.min(500, Math.floor(students)));
  // Simulate from a fresh pool so the numbers describe the engine, not past usage.
  const r = simulate(
    pool.map((q) => ({ id: q.id, topic: q.topic, timesServed: 0, optionCount: parseOptions(q.options).length })),
    k,
    n,
  );
  const index = new Map(pool.map((q, i) => [q.id, i + 1]));
  return { ...r, k, poolSize: pool.length, sampleSets: r.sampleSets.map((s) => s.map((id) => index.get(id)!)) };
}

/* ------------------------------ Attempts ------------------------------- */

export async function deleteAttemptAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id }, include: { questions: true } });
  await prisma.$transaction([
    prisma.question.updateMany({
      where: { id: { in: attempt.questions.map((q) => q.questionId) }, timesServed: { gt: 0 } },
      data: { timesServed: { decrement: 1 } },
    }),
    prisma.attempt.delete({ where: { id } }),
  ]);
  revalidatePath(`/admin/assessments/${attempt.assessmentId}`, "layout");
}

/* -------------------------------- Users -------------------------------- */

export async function setRoleAction(fd: FormData) {
  const me = await requireAdmin();
  const id = String(fd.get("id"));
  const role = fd.get("role") === "ADMIN" ? "ADMIN" : "USER";
  if (id === me.id && role !== "ADMIN") return; // don't lock yourself out
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

export async function deleteUserAction(fd: FormData) {
  const me = await requireAdmin();
  const id = String(fd.get("id"));
  if (id === me.id) return;
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
