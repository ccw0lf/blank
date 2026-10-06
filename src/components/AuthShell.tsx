import Link from "next/link";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-xs text-white">QA</span>
          Assessment Portal
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 mb-6 text-sm text-slate-600">{subtitle}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
