"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeAttempt, QuizError, saveAnswer, startOrResumeAttempt } from "@/lib/quiz";
import type { FormState } from "@/components/FormMessage";

export async function startAttemptAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const assessmentId = String(fd.get("assessmentId") ?? "");
  let attemptId: string;
  try {
    attemptId = (await startOrResumeAttempt(user.id, assessmentId)).id;
  } catch (e) {
    if (e instanceof QuizError) return { error: e.message };
    throw e;
  }
  redirect(`/attempt/${attemptId}`);
}

export async function saveAnswerAction(attemptId: string, questionId: string, displayIndex: number) {
  const user = await requireUser();
  try {
    await saveAnswer(user.id, attemptId, questionId, displayIndex);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof QuizError) return { ok: false as const, error: e.message };
    throw e;
  }
}

export async function submitAttemptAction(attemptId: string) {
  const user = await requireUser();
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId }, select: { userId: true } });
  if (!attempt || attempt.userId !== user.id) return { ok: false as const, error: "Attempt not found." };
  await finalizeAttempt(attemptId);
  return { ok: true as const };
}
