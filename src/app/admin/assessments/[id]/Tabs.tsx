"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, HelpCircle, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Tabs({ id, counts }: { id: string; counts: { questions: number; results: number } }) {
  const path = usePathname();
  const base = `/admin/assessments/${id}`;
  const tabs = [
    { href: base, label: "Overview", icon: LayoutDashboard },
    { href: `${base}/questions`, label: "Questions", count: counts.questions, icon: HelpCircle },
    { href: `${base}/results`, label: "Results", count: counts.results, icon: BarChart3 },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Assessment sections">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition",
              active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <t.icon size={16} />
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600")}>{t.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
