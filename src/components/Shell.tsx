"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  ClipboardList,
  Eye,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  assessments: ClipboardList,
  quiz: ClipboardCheck,
  history: History,
  users: Users,
  profile: UserCircle,
  eye: Eye,
  shield: ShieldCheck,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };
type ShellUser = { name: string; email: string; role: "USER" | "ADMIN" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Shell({
  user,
  groups,
  panel,
  children,
}: {
  user: ShellUser;
  groups: NavGroup[];
  panel: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <ClipboardCheck size={20} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Assessment Portal</p>
          <p className="text-[11px] tracking-wide text-slate-400 uppercase">{panel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{g.label}</p>}
            <ul className="space-y-1">
              {g.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-brand-500" />}
                      <Icon size={18} className={active ? "text-brand-200" : "text-slate-500 group-hover:text-slate-300"} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600/30 text-xs font-semibold text-brand-100">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* mobile top bar + drawer */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-white">
            <ClipboardCheck size={16} />
          </span>
          Assessment Portal
        </span>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl">
            {sidebar}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 -right-12 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white text-slate-700 shadow"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
