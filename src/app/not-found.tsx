import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-semibold text-slate-300">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-slate-600">The link may be wrong, or the assessment isn&apos;t available yet.</p>
      <Link href="/" className="btn-primary mt-6">Go home</Link>
    </main>
  );
}
