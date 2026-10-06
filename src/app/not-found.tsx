import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400"><SearchX size={28} /></span>
      <h1 className="mt-5 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 max-w-sm text-slate-600">The link may be wrong, or the assessment isn&apos;t available yet.</p>
      <Link href="/" className="btn-primary mt-6"><Home size={16} /> Go home</Link>
    </main>
  );
}
