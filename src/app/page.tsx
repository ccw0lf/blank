import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 font-semibold text-white">QA</span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Training Assessment Portal</h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Take the MCQ assessment for your training session. Every participant gets their own randomized set of
        questions, and you see your result as soon as you submit.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className="btn-primary">Log in</Link>
        <Link href="/register" className="btn-secondary">Create account</Link>
      </div>
    </main>
  );
}
