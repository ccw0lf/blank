import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { slugify } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const a = await prisma.assessment.findUnique({ where: { id } });
  if (!a) return new Response("Not found", { status: 404 });

  const attempts = await prisma.attempt.findMany({
    where: { assessmentId: id },
    include: { user: true },
    orderBy: [{ user: { name: "asc" } }, { attemptNo: "asc" }],
  });
  const iso = (d: Date | null) => (d ? d.toISOString() : "");
  const csv = toCsv([
    ["Assessment", "Name", "Email", "Department", "Attempt", "Status", "Started", "Submitted", "Score", "Total", "Percent", "Result"],
    ...attempts.map((t) => [
      a.title,
      t.user.name,
      t.user.email,
      t.user.department,
      t.attemptNo,
      t.status,
      iso(t.startedAt),
      iso(t.submittedAt),
      t.score,
      t.total,
      t.percent == null ? "" : t.percent.toFixed(1),
      t.passed == null ? "" : t.passed ? "PASS" : "FAIL",
    ]),
  ]);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(a.title) || "results"}-results.csv"`,
    },
  });
}
