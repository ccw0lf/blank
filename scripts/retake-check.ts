// Verifies retake limits are enforced server-side: `npx tsx --conditions react-server --env-file=.env scripts/retake-check.ts`
import { prisma } from "../src/lib/db";
import { startOrResumeAttempt, QuizError } from "../src/lib/quiz";

async function main() {
const user = await prisma.user.findFirstOrThrow({ where: { email: { startsWith: "rt_" } } });
for (const slug of ["one-retake-quiz", "no-retake-quiz", "unlimited-quiz"]) {
  const a = await prisma.assessment.findUniqueOrThrow({ where: { slug } });
  try {
    const at = await startOrResumeAttempt(user.id, a.id);
    console.log(slug, "→ allowed, attempt", at.attemptNo);
    await prisma.attempt.delete({ where: { id: at.id } });
  } catch (e) {
    console.log(slug, "→ blocked:", e instanceof QuizError ? e.message : e);
  }
}
await prisma.$disconnect();
}
main();
