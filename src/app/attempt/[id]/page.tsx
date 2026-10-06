import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeAttempt, isExpired } from "@/lib/quiz";
import { parseOptions } from "@/lib/utils";
import { QuizRunner, type RunnerQuestion } from "./QuizRunner";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/attempt/${id}`);
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      assessment: { select: { title: true, slug: true } },
      questions: { orderBy: { position: "asc" }, include: { question: { select: { text: true, options: true } } } },
    },
  });
  if (!attempt || attempt.userId !== user.id) notFound();
  if (attempt.status === "SUBMITTED") redirect(`/attempt/${id}/result`);
  if (isExpired(attempt.deadline, 30_000)) {
    await finalizeAttempt(id);
    redirect(`/attempt/${id}/result`);
  }

  // Only send what the student needs: options in their shuffled order, never the answer key.
  const questions: RunnerQuestion[] = attempt.questions.map((aq) => {
    const opts = parseOptions(aq.question.options);
    const order: number[] = JSON.parse(aq.optionOrder);
    return {
      id: aq.questionId,
      text: aq.question.text,
      options: order.map((i) => opts[i]),
      selected: aq.selectedIndex === null ? null : order.indexOf(aq.selectedIndex),
    };
  });

  return (
    <QuizRunner
      attemptId={attempt.id}
      title={attempt.assessment.title}
      deadline={attempt.deadline?.toISOString() ?? null}
      questions={questions}
    />
  );
}
