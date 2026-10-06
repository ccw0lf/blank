export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function pct(n: number | null | undefined) {
  return n == null ? "—" : `${Math.round(n * 10) / 10}%`;
}

export function parseOptions(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** Is the assessment currently open for new attempts? Returns a reason if not. */
export function availability(a: {
  isPublished: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): { open: boolean; reason?: string } {
  const now = new Date();
  if (!a.isPublished) return { open: false, reason: "This assessment is not published yet." };
  if (a.startsAt && now < a.startsAt) return { open: false, reason: `Opens on ${fmtDate(a.startsAt)}.` };
  if (a.endsAt && now > a.endsAt) return { open: false, reason: `Closed on ${fmtDate(a.endsAt)}.` };
  return { open: true };
}
