import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { REPORT_TYPES, getReport, type ReportType } from "@/lib/reports";

export async function GET(req: Request) {
  const user = await getSession();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const u = new URL(req.url).searchParams;
  const type = u.get("type") as ReportType;
  if (!REPORT_TYPES.includes(type)) return new Response("Unknown report", { status: 400 });
  const report = await getReport(type, {
    assessmentId: u.get("assessment") || undefined,
    from: u.get("from") || undefined,
    to: u.get("to") || undefined,
  });
  const csv = toCsv([report.columns.map((c) => c.label), ...report.rows]);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
