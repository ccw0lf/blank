import { getSession } from "@/lib/auth";
import { CSV_TEMPLATE } from "@/lib/csv";

export async function GET() {
  const user = await getSession();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  return new Response("﻿" + CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="questions-template.csv"',
    },
  });
}
