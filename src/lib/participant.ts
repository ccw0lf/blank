import "server-only";
import { prisma } from "./db";
import { availability } from "./utils";

export type AssessmentCard = {
  id: string;
  slug: string;
  title: string;
  trainingSession: string | null;
  description: string | null;
  questionCount: number;
  durationMinutes: number | null;
  passPercent: number;
  maxAttempts: number;
  attemptsUsed: number;
  best: number | null;
  passed: boolean;
  inProgressId: string | null;
  lastAttemptId: string | null;
  closedReason: string | null;
  state: "in_progress" | "available" | "retake" | "completed" | "closed";
};

/** Published assessments with this student's progress on each. */
export async function getAssessmentCards(userId: string): Promise<AssessmentCard[]> {
  const [assessments, attempts] = await Promise.all([
    prisma.assessment.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: { where: { isActive: true } } } } },
    }),
    prisma.attempt.findMany({
      where: { userId },
      select: { id: true, assessmentId: true, status: true, percent: true, passed: true, submittedAt: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return assessments.map((a) => {
    const mine = attempts.filter((t) => t.assessmentId === a.id);
    const submitted = mine.filter((t) => t.status === "SUBMITTED");
    const inProgress = mine.find((t) => t.status === "IN_PROGRESS");
    const best = submitted.length ? Math.max(...submitted.map((t) => t.percent ?? 0)) : null;
    const avail = availability(a);
    const attemptsLeft = a.maxAttempts - mine.length;
    let state: AssessmentCard["state"];
    if (inProgress) state = "in_progress";
    else if (!avail.open && !submitted.length) state = "closed";
    else if (attemptsLeft > 0 && avail.open && a._count.questions > 0) state = submitted.length ? "retake" : "available";
    else state = submitted.length ? "completed" : "closed";
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      trainingSession: a.trainingSession,
      description: a.description,
      questionCount: Math.min(a.questionsPerAttempt, a._count.questions),
      durationMinutes: a.durationMinutes,
      passPercent: a.passPercent,
      maxAttempts: a.maxAttempts,
      attemptsUsed: mine.length,
      best,
      passed: submitted.some((t) => t.passed),
      inProgressId: inProgress?.id ?? null,
      lastAttemptId: submitted[0]?.id ?? null,
      closedReason: avail.open ? null : (avail.reason ?? null),
      state,
    };
  });
}
