"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Tabs({ id, counts }: { id: string; counts: { questions: number; results: number } }) {
  const path = usePathname();
  const base = `/admin/assessments/${id}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/questions`, label: `Questions (${counts.questions})` },
    { href: `${base}/results`, label: `Results (${counts.results})` },
    { href: `${base}/settings`, label: "Settings" },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap",
            path === t.href ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
