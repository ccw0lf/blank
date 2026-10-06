import Link from "next/link";
import {
  Award,
  BarChart3,
  Building2,
  Clock3,
  Download,
  FileBarChart,
  Filter,
  HelpCircle,
  ClipboardList,
  Repeat,
  Users,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { REPORT_META, REPORT_TYPES, getReport, getSummary, type Cell, type ReportType } from "@/lib/reports";
import { cn, pct } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { ProgressBar } from "@/components/Charts";
import { EmptyState } from "@/components/EmptyState";
import { PrintButton } from "@/components/PrintButton";

const TAB_ICONS: Record<ReportType, React.ReactNode> = {
  assessments: <ClipboardList size={16} />,
  participants: <Users size={16} />,
  departments: <Building2 size={16} />,
  questions: <HelpCircle size={16} />,
  retakes: <Repeat size={16} />,
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; assessment?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const tab: ReportType = REPORT_TYPES.includes(sp.tab as ReportType) ? (sp.tab as ReportType) : "assessments";
  const filters = { assessmentId: sp.assessment || undefined, from: sp.from || undefined, to: sp.to || undefined };

  const [assessments, summary, report] = await Promise.all([
    prisma.assessment.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    getSummary(filters),
    getReport(tab, filters),
  ]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (filters.assessmentId) p.set("assessment", filters.assessmentId);
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  };
  const scope = filters.assessmentId ? assessments.find((a) => a.id === filters.assessmentId)?.title : "All assessments";
  const period = filters.from || filters.to ? `${filters.from ?? "start"} → ${filters.to ?? "today"}` : "All time";

  const cell = (v: Cell, kind: string | undefined, label: string) => {
    if (v === null || v === "") return <span className="text-slate-400">—</span>;
    if (kind === "pct" && typeof v === "number")
      return (
        <div className="min-w-20">
          <span className="tabular-nums">{v}%</span>
          <div className="mt-1">
            <ProgressBar value={v} tone={label.startsWith("Correct") || label.startsWith("Avg") || label.startsWith("Pass") ? (v >= 60 ? "green" : "red") : "brand"} />
          </div>
        </div>
      );
    if (kind === "num" && typeof v === "number") {
      if (label.startsWith("Change")) return <span className={cn("tabular-nums", v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "")}>{v > 0 ? "+" : ""}{v}</span>;
      return <span className="tabular-nums">{v}</span>;
    }
    return String(v);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Analyse participation, performance and retakes. Filter, then export to CSV or print."
        actions={
          <>
            <a href={`/api/admin/reports/export?${qs({ type: tab })}`} className="btn-primary"><Download size={16} /> Export CSV</a>
            <PrintButton />
          </>
        }
      />

      <form className="card mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <input type="hidden" name="tab" value={tab} />
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="r-a">Assessment</label>
          <select id="r-a" name="assessment" defaultValue={filters.assessmentId ?? ""} className="input">
            <option value="">All assessments</option>
            {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-f">From</label>
          <input id="r-f" type="date" name="from" defaultValue={filters.from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r-t">To</label>
          <input id="r-t" type="date" name="to" defaultValue={filters.to} className="input" />
        </div>
        <button className="btn-secondary"><Filter size={16} /> Apply</button>
        {(filters.assessmentId || filters.from || filters.to) && <Link href={`/admin/reports?tab=${tab}`} className="pb-2 text-sm text-slate-500 hover:text-slate-900">Clear</Link>}
      </form>

      <p className="mb-3 hidden text-sm text-slate-600 print:block">
        {scope} · {period} · generated {new Date().toLocaleDateString("en-GB")}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Submissions" value={summary.submissions} icon={<CheckCircle2 />} tone="green" />
        <Stat label="Participants" value={summary.participants} icon={<Users />} tone="brand" />
        <Stat label="Avg score" value={pct(summary.avgScore)} icon={<BarChart3 />} tone="violet" />
        <Stat label="Pass rate" value={pct(summary.passRate)} icon={<Award />} tone="amber" />
        <Stat label="Retakes" value={summary.retakes} icon={<Repeat />} tone="sky" />
        <Stat label="Avg time" value={summary.avgMinutes === null ? "—" : `${summary.avgMinutes} min`} icon={<Clock3 />} tone="red" />
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 print:hidden" aria-label="Report type">
        {REPORT_TYPES.map((t) => (
          <Link
            key={t}
            href={`/admin/reports?${qs({ tab: t })}`}
            aria-current={t === tab ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition",
              t === tab ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {TAB_ICONS[t]} {REPORT_META[t].label}
          </Link>
        ))}
      </nav>

      <section className="card mt-4 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <FileBarChart size={18} className="text-slate-400" />
          <div>
            <h2 className="font-semibold">{REPORT_META[tab].label} report</h2>
            <p className="text-xs text-slate-500">{REPORT_META[tab].description} {report.rows.length} row{report.rows.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        {report.rows.length === 0 ? (
          <EmptyState icon={<FileBarChart />} title="No data for this report">
            {tab === "retakes" ? "No participant has retaken an assessment in this period." : "Try widening the date range or choosing another assessment."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>{report.columns.map((c) => <th key={c.label} className={c.kind === "num" || c.kind === "pct" ? "whitespace-nowrap" : ""}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {report.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, ci) => (
                      <td key={ci} className={cn(report.columns[ci].label === "Question" && "max-w-md")}>{cell(v, report.columns[ci].kind, report.columns[ci].label)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
