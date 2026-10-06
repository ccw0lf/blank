import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export function TopBar({ user, links }: { user: SessionUser | null; links?: { href: string; label: string }[] }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-xs text-white">QA</span>
          <span className="hidden sm:inline">Assessment Portal</span>
        </Link>
        <nav className="flex flex-1 items-center gap-4 overflow-x-auto text-sm text-slate-600">
          {links?.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-slate-900">
              {l.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 md:inline">
              {user.name}
              {user.role === "ADMIN" && <span className="badge ml-2 bg-amber-100 text-amber-800">Admin</span>}
            </span>
            <form action={logoutAction}>
              <button className="btn-secondary btn-sm">Log out</button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="btn-primary btn-sm">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
