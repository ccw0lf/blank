import Link from "next/link";
import { BarChart3, ClipboardCheck, Shuffle, Trophy } from "lucide-react";

const POINTS = [
  { icon: Shuffle, title: "Randomized for every participant", text: "Each person gets their own set of questions from the bank." },
  { icon: Trophy, title: "Instant results", text: "See your score and a full answer review as soon as you submit." },
  { icon: BarChart3, title: "Track your progress", text: "Your whole assessment history and stats in one place." },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-lg shadow-brand-600/30">
              <ClipboardCheck size={20} />
            </span>
            Assessment Portal
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 mb-7 text-sm text-slate-600">{subtitle}</p>}
          {children}
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:items-center lg:justify-center">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative max-w-md px-10 text-white">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">Turn every training session into measurable learning.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-200"><p.icon size={20} /></span>
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
