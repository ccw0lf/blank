import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, ClipboardCheck, Link2, ShieldCheck, Shuffle, Timer } from "lucide-react";
import { getSession } from "@/lib/auth";

const FEATURES = [
  { icon: Link2, title: "Share one link", text: "Send the assessment link right after your training session." },
  { icon: Shuffle, title: "Unique question sets", text: "Every participant gets a different random selection from your question bank." },
  { icon: Timer, title: "Timed & auto-saved", text: "Optional time limits, instant grading and a full answer review." },
  { icon: BarChart3, title: "Rich analytics", text: "Pass rates, score distribution and the hardest questions at a glance." },
  { icon: ShieldCheck, title: "Secure by design", text: "Answer keys never reach the browser. Role-based admin access." },
];

export default async function Home() {
  const user = await getSession();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="flex items-center gap-2.5 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white"><ClipboardCheck size={20} /></span>
          Assessment Portal
        </span>
        <div className="flex gap-2">
          <Link href="/login" className="btn-secondary">Log in</Link>
          <Link href="/register" className="btn-primary hidden sm:inline-flex">Create account</Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-gradient-to-b from-brand-50 to-white" />
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-20 text-center sm:pt-24">
          <span className="badge bg-brand-50 px-3 py-1 text-brand-700 ring-1 ring-brand-200 ring-inset">Post-training MCQ assessments</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Measure what your training actually taught</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Take the quiz for your training session. Every participant gets their own randomized questions, and you see your result the moment you submit.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn-primary px-5 py-2.5">Log in <ArrowRight size={16} /></Link>
            <Link href="/register" className="btn-secondary px-5 py-2.5">Create account</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600"><f.icon size={20} /></span>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
