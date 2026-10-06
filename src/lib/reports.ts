import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { parseOptions } from "./utils";

export const REPORT_TYPES = ["assessments", "participants", "departments", "questions", "retakes"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_META: Record<ReportType, { label: string; description: string }> = {
  assessments: { label: "Assessments", description: "Participation, scores and pass rate for each assessment." },
  participants: { label: "Participants", description: "Every participant's attempts, retakes and scores." },
  departments: { label: "Departments", description: "Performance grouped by department / team." },
  questions: { label: "Question analysis", description: "How each question performed, and the most common wrong answer." },
  retakes: { label: "Retakes", description: "Participants who retook an assessment and how their score changed." },
};

export type ReportFilters = { assessmentId?: string; from?: string; to?: string };

export type Column = { label: string; kind?: "text" | "num" | "pct" };
export type Cell = string | number | null;
export type Report = { type: ReportType; columns: Column[]; rows: Cell[][] };

export type Summary = {
  submissions: number;
  participants: number;
  avgScore: number | null;
  passRate: number | null;
  retakes: number;
  avgMinutes: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const minutes = (a: { startedAt: Date; submittedAt: Date | null }) =>
  a.submittedAt ? (a.submittedAt.getTime() - a.startedAt.getTime()) / 60000 : null;

function dateRange(f: ReportFilters) {
  const range: { gte?: Date; lte?: Date } = {};
  if (f.from) range.gte = new Date(`${f.from}T00:00:00`);
  if (f.to) range.lte = new Date(`${f.to}T23:59:59.999`);
  return Object.keys(range).length ? range : undefined;
}

function attemptWhere(f: ReportFilters): Prisma.AttemptWhereInput {
  return {
    status: "SUBMITTED",
    ...(f.assessmentId ? { assessmentId: f.assessmentId } : {}),
    ...(dateRange(f) ? { submittedAt: dateRange(f) } : {}),
  };
}

async function loadAttempts(f: ReportFilters) {
  return prisma.attempt.findMany({
    where: attemptWhere(f),
    include: {
      user: { select: { id: true, name: true, email: true, department: true } },
      assessment: { select: { id: true, title: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
}
type AttemptRow = Awaited<ReturnType<typeof loadAttempts>>[number];

export async function getSummary(f: ReportFilters): Promise<Summary> {
  const attempts = await loadAttempts(f);
  return summarize(attempts);
}

function summarize(attempts: AttemptRow[]): Summary {
  const mins = attempts.map(minutes).filter((m): m is number => m !== null);
  return {
    submissions: attempts.length,
    participants: new Set(attempts.map((a) => a.userId)).size,
    avgScore: avg(attempts.map((a) => a.percent ?? 0)),
    passRate: attempts.length ? round1((attempts.filter((a) => a.passed).length / attempts.length) * 100) : null,
    retakes: attempts.filter((a) => a.attemptNo > 1).length,
    avgMinutes: avg(mins),
  };
}

export async function getReport(type: ReportType, f: ReportFilters): Promise<Report> {
  if (type === "questions") return questionReport(f);
  const attempts = await loadAttempts(f);
  switch (type) {
    case "assessments":
      return assessmentReport(attempts);
    case "participants":
      return participantReport(attempts);
    case "departments":
      return departmentReport(attempts);
    case "retakes":
      return retakeReport(attempts);
  }
}

function groupBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  for (const i of items) {
    const k = key(i);
    m.set(k, [...(m.get(k) ?? []), i]);
  }
  return m;
}

function assessmentReport(attempts: AttemptRow[]): Report {
  const rows = [...groupBy(attempts, (a) => a.assessmentId).values()].map((g) => {
    const pcts = g.map((a) => a.percent ?? 0);
    return [
      g[0].assessment.title,
      new Set(g.map((a) => a.userId)).size,
      g.length,
      g.filter((a) => a.attemptNo > 1).length,
      avg(pcts),
      round1(Math.max(...pcts)),
      round1(Math.min(...pcts)),
      round1((g.filter((a) => a.passed).length / g.length) * 100),
      avg(g.map(minutes).filter((m): m is number => m !== null)),
    ] as Cell[];
  });
  rows.sort((a, b) => Number(b[2]) - Number(a[2]));
  return {
    type: "assessments",
    columns: [
      { label: "Assessment" },
      { label: "Participants", kind: "num" },
      { label: "Submissions", kind: "num" },
      { label: "Retakes", kind: "num" },
      { label: "Avg score %", kind: "pct" },
      { label: "Highest %", kind: "pct" },
      { label: "Lowest %", kind: "pct" },
      { label: "Pass rate %", kind: "pct" },
      { label: "Avg time (min)", kind: "num" },
    ],
    rows,
  };
}

function participantReport(attempts: AttemptRow[]): Report {
  const rows = [...groupBy(attempts, (a) => a.userId).values()].map((g) => {
    const u = g[0].user;
    const last = g[g.length - 1].submittedAt;
    return [
      u.name,
      u.email,
      u.department,
      new Set(g.map((a) => a.assessmentId)).size,
      g.length,
      g.filter((a) => a.attemptNo > 1).length,
      avg(g.map((a) => a.percent ?? 0)),
      round1(Math.max(...g.map((a) => a.percent ?? 0))),
      g.filter((a) => a.passed).length,
      last ? last.toISOString().slice(0, 10) : null,
    ] as Cell[];
  });
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return {
    type: "participants",
    columns: [
      { label: "Name" },
      { label: "Email" },
      { label: "Department" },
      { label: "Assessments", kind: "num" },
      { label: "Submissions", kind: "num" },
      { label: "Retakes", kind: "num" },
      { label: "Avg score %", kind: "pct" },
      { label: "Best %", kind: "pct" },
      { label: "Passed", kind: "num" },
      { label: "Last activity" },
    ],
    rows,
  };
}

function departmentReport(attempts: AttemptRow[]): Report {
  const rows = [...groupBy(attempts, (a) => a.user.department?.trim() || "(none)").entries()].map(([dept, g]) => {
    return [
      dept,
      new Set(g.map((a) => a.userId)).size,
      g.length,
      g.filter((a) => a.attemptNo > 1).length,
      avg(g.map((a) => a.percent ?? 0)),
      round1((g.filter((a) => a.passed).length / g.length) * 100),
    ] as Cell[];
  });
  rows.sort((a, b) => Number(b[4]) - Number(a[4]));
  return {
    type: "departments",
    columns: [
      { label: "Department" },
      { label: "Participants", kind: "num" },
      { label: "Submissions", kind: "num" },
      { label: "Retakes", kind: "num" },
      { label: "Avg score %", kind: "pct" },
      { label: "Pass rate %", kind: "pct" },
    ],
    rows,
  };
}

function retakeReport(attempts: AttemptRow[]): Report {
  const rows: Cell[][] = [];
  for (const g of groupBy(attempts, (a) => `${a.userId}|${a.assessmentId}`).values()) {
    const sorted = [...g].sort((a, b) => a.attemptNo - b.attemptNo);
    const retakes = sorted.filter((a) => a.attemptNo > 1).length;
    if (!retakes) continue;
    const first = sorted[0].percent ?? 0;
    const latest = sorted[sorted.length - 1].percent ?? 0;
    rows.push([
      sorted[0].user.name,
      sorted[0].user.email,
      sorted[0].assessment.title,
      sorted.length,
      retakes,
      round1(first),
      round1(Math.max(...sorted.map((a) => a.percent ?? 0))),
      round1(latest),
      round1(latest - first),
      sorted.some((a) => a.passed) ? "Yes" : "No",
    ]);
  }
  rows.sort((a, b) => Number(b[4]) - Number(a[4]) || String(a[0]).localeCompare(String(b[0])));
  return {
    type: "retakes",
    columns: [
      { label: "Participant" },
      { label: "Email" },
      { label: "Assessment" },
      { label: "Attempts", kind: "num" },
      { label: "Retakes", kind: "num" },
      { label: "First %", kind: "pct" },
      { label: "Best %", kind: "pct" },
      { label: "Latest %", kind: "pct" },
      { label: "Change (pts)", kind: "num" },
      { label: "Passed" },
    ],
    rows,
  };
}

async function questionReport(f: ReportFilters): Promise<Report> {
  const range = dateRange(f);
  const items = await prisma.attemptQuestion.findMany({
    where: {
      attempt: {
        status: "SUBMITTED",
        ...(f.assessmentId ? { assessmentId: f.assessmentId } : {}),
        ...(range ? { submittedAt: range } : {}),
      },
    },
    select: {
      questionId: true,
      selectedIndex: true,
      isCorrect: true,
      question: {
        select: { text: true, topic: true, options: true, correctIndex: true, assessment: { select: { title: true } } },
      },
    },
  });
  const rows = [...groupBy(items, (i) => i.questionId).values()].map((g) => {
    const q = g[0].question;
    const opts = parseOptions(q.options);
    const correct = g.filter((i) => i.isCorrect).length;
    const skipped = g.filter((i) => i.selectedIndex === null).length;
    const wrong = new Map<number, number>();
    for (const i of g) if (!i.isCorrect && i.selectedIndex !== null) wrong.set(i.selectedIndex, (wrong.get(i.selectedIndex) ?? 0) + 1);
    const top = [...wrong.entries()].sort((a, b) => b[1] - a[1])[0];
    return [
      q.assessment.title,
      q.text,
      q.topic,
      g.length,
      round1((correct / g.length) * 100),
      skipped,
      top ? `${opts[top[0]] ?? "?"} (${top[1]})` : null,
    ] as Cell[];
  });
  rows.sort((a, b) => Number(a[4]) - Number(b[4])); // hardest first
  return {
    type: "questions",
    columns: [
      { label: "Assessment" },
      { label: "Question" },
      { label: "Topic" },
      { label: "Answered", kind: "num" },
      { label: "Correct %", kind: "pct" },
      { label: "Skipped", kind: "num" },
      { label: "Most common wrong answer" },
    ],
    rows,
  };
}
