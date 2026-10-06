import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { generateQuestionSet } from "./engine";
import { availability, parseOptions, retakeStatus } from "./utils";

/** Answers arriving this long after the deadline (network lag) are still accepted. */
const GRACE_MS = 30_000;

export class QuizError extends Error {}

/**
 * Resume the student's in-progress attempt, or create a new one with a
 * freshly generated, unique question set.
 */
export async function startOrResumeAttempt(userId: string, assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new QuizError("Assessment not found.");

  const existing = await prisma.attempt.findFirst({
    where: { userId, assessmentId, status: "IN_PROGRESS" },
  });
  if (existing) {
    if (isExpired(existing.deadline)) {
      await finalizeAttempt(existing.id);
    } else return existing;
  }

  const avail = availability(assessment);
  if (!avail.open) throw new QuizError(avail.reason!);

  const previous = await prisma.attempt.findMany({
    where: { userId, assessmentId },
    select: { attemptNo: true, questions: { select: { questionId: true } } },
  });
  if (!retakeStatus(assessment.maxRetakes, previous.length).canStart)
    throw new QuizError(
      assessment.maxRetakes === 0
        ? "You have already completed this assessment. Retakes are not allowed."
        : `You have used all ${assessment.maxRetakes} retake(s) for this assessment.`,
    );

  // Retry on unique-constraint races (double click / two tabs).
  for (let tries = 0; tries < 3; tries++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const pool = await tx.question.findMany({
          where: { assessmentId, isActive: true },
          select: { id: true, topic: true, timesServed: true, options: true },
        });
        const used = await tx.attempt.findMany({ where: { assessmentId }, select: { setSignature: true } });
        const seen = new Set(previous.flatMap((p) => p.questions.map((q) => q.questionId)));

        const k = Math.min(assessment.questionsPerAttempt, pool.length);
        if (k === 0) throw new QuizError("This assessment has no questions yet.");

        const result = generateQuestionSet({
          pool: pool.map((q) => ({
            id: q.id,
            topic: q.topic,
            timesServed: q.timesServed,
            optionCount: parseOptions(q.options).length,
          })),
          k,
          shuffleOptions: assessment.shuffleOptions,
          usedSignatures: new Set(used.map((u) => u.setSignature)),
          seenByUser: seen,
        });

        const attemptNo = Math.max(0, ...previous.map((p) => p.attemptNo)) + 1;
        const attempt = await tx.attempt.create({
          data: {
            userId,
            assessmentId,
            attemptNo,
            setSignature: result.signature,
            total: result.items.length,
            deadline: assessment.durationMinutes
              ? new Date(Date.now() + assessment.durationMinutes * 60_000)
              : null,
            questions: {
              create: result.items.map((i) => ({
                questionId: i.questionId,
                position: i.position,
                optionOrder: JSON.stringify(i.optionOrder),
              })),
            },
          },
        });
        await tx.question.updateMany({
          where: { id: { in: result.items.map((i) => i.questionId) } },
          data: { timesServed: { increment: 1 } },
        });
        return attempt;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await prisma.attempt.findFirst({ where: { userId, assessmentId, status: "IN_PROGRESS" } });
        if (again) return again;
        continue;
      }
      throw e;
    }
  }
  throw new QuizError("Could not start the attempt, please try again.");
}

export function isExpired(deadline: Date | null, graceMs = 0) {
  return !!deadline && Date.now() > deadline.getTime() + graceMs;
}

/** Save one answer. `displayIndex` is the option position the student saw. */
export async function saveAnswer(userId: string, attemptId: string, questionId: string, displayIndex: number) {
  const aq = await prisma.attemptQuestion.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
    include: { attempt: true },
  });
  if (!aq || aq.attempt.userId !== userId) throw new QuizError("Question not found.");
  if (aq.attempt.status !== "IN_PROGRESS") throw new QuizError("This attempt is already submitted.");
  if (isExpired(aq.attempt.deadline, GRACE_MS)) throw new QuizError("Time is up.");

  const order: number[] = JSON.parse(aq.optionOrder);
  if (!Number.isInteger(displayIndex) || displayIndex < 0 || displayIndex >= order.length)
    throw new QuizError("Invalid option.");
  await prisma.attemptQuestion.update({
    where: { id: aq.id },
    data: { selectedIndex: order[displayIndex] },
  });
}

/** Grade and close an attempt. Idempotent. */
export async function finalizeAttempt(attemptId: string) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true, questions: { include: { question: true } } },
    });
    if (!attempt) throw new QuizError("Attempt not found.");
    if (attempt.status === "SUBMITTED") return attempt;

    let score = 0;
    for (const aq of attempt.questions) {
      const correct = aq.selectedIndex !== null && aq.selectedIndex === aq.question.correctIndex;
      if (correct) score++;
      await tx.attemptQuestion.update({ where: { id: aq.id }, data: { isCorrect: correct } });
    }
    const percent = attempt.total ? (score / attempt.total) * 100 : 0;
    return tx.attempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        score,
        percent,
        passed: percent >= attempt.assessment.passPercent,
      },
    });
  });
}

/** Close any attempts whose timer ran out (called lazily when pages load). */
export async function finalizeExpired(where: Prisma.AttemptWhereInput = {}) {
  const expired = await prisma.attempt.findMany({
    where: { ...where, status: "IN_PROGRESS", deadline: { lt: new Date(Date.now() - GRACE_MS) } },
    select: { id: true },
  });
  for (const a of expired) await finalizeAttempt(a.id);
}
