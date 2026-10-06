/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

export type ParsedQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  topic: string | null;
};

const LETTERS = "ABCDEFGH";

/**
 * Expected header (case-insensitive, order free):
 *   question, option_a, option_b, [option_c ... option_h], answer, [explanation], [topic]
 * `answer` is a letter (A-H), a 1-based number, or the exact option text.
 */
export function parseQuestionCsv(text: string): { questions: ParsedQuestion[]; errors: string[] } {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  if (rows.length < 2) return { questions, errors: ["CSV needs a header row and at least one question."] };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  const qCol = col("question");
  const aCol = col("answer");
  const eCol = col("explanation");
  const tCol = col("topic");
  const optCols = LETTERS.split("")
    .map((l) => {
      const i = col(`option_${l.toLowerCase()}`);
      return i >= 0 ? i : col(l.toLowerCase());
    })
    .filter((i) => i >= 0);

  if (qCol < 0 || aCol < 0 || optCols.length < 2)
    return { questions, errors: ["Header must contain: question, option_a, option_b, ..., answer"] };

  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const qText = (r[qCol] ?? "").trim();
    const options = optCols.map((i) => (r[i] ?? "").trim()).filter(Boolean);
    const ans = (r[aCol] ?? "").trim();
    if (!qText) return errors.push(`Line ${line}: question text is empty.`);
    if (options.length < 2) return errors.push(`Line ${line}: at least 2 options are required.`);

    let correctIndex = -1;
    if (/^[A-Ha-h]$/.test(ans)) correctIndex = LETTERS.indexOf(ans.toUpperCase());
    else if (/^\d+$/.test(ans)) correctIndex = Number(ans) - 1;
    else correctIndex = options.findIndex((o) => o.toLowerCase() === ans.toLowerCase());
    if (correctIndex < 0 || correctIndex >= options.length)
      return errors.push(`Line ${line}: answer "${ans}" doesn't match any option.`);

    questions.push({
      text: qText,
      options,
      correctIndex,
      explanation: eCol >= 0 ? (r[eCol] ?? "").trim() || null : null,
      topic: tCol >= 0 ? (r[tCol] ?? "").trim() || null : null,
    });
  });
  return { questions, errors };
}

export const CSV_TEMPLATE = toCsv([
  ["question", "option_a", "option_b", "option_c", "option_d", "answer", "explanation", "topic"],
  [
    "Which control best ensures only authorised changes reach production?",
    "Daily backups",
    "Formal change management with approvals",
    "Antivirus software",
    "Network firewall",
    "B",
    "Change management requires review and approval before deployment.",
    "Change Management",
  ],
  [
    "What does the principle of least privilege mean?",
    "Users get the minimum access needed for their job",
    "Admins have unrestricted access",
    "All users share one account",
    "Access is reviewed once every five years",
    "A",
    "",
    "Access Control",
  ],
]);
