import { Search, ShieldCheck, ShieldOff, Trash2, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, pct } from "@/lib/utils";
import { deleteUserAction, setRoleAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { department: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const stats = await prisma.attempt.groupBy({
    by: ["userId"],
    where: { status: "SUBMITTED" },
    _count: { _all: true },
    _avg: { percent: true },
  });
  const passes = await prisma.attempt.groupBy({
    by: ["userId"],
    where: { status: "SUBMITTED", passed: true },
    _count: { _all: true },
  });
  const taken = await prisma.attempt.findMany({
    select: { userId: true, assessment: { select: { title: true } } },
    distinct: ["userId", "assessmentId"],
  });
  const titlesByUser = new Map<string, string[]>();
  for (const t of taken) titlesByUser.set(t.userId, [...(titlesByUser.get(t.userId) ?? []), t.assessment.title]);
  const sMap = new Map(stats.map((s) => [s.userId, s]));
  const pMap = new Map(passes.map((p) => [p.userId, p._count._all]));

  return (
    <>
      <PageHeader
        title="Users"
        description={`${users.length} account${users.length === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}`}
        actions={
          <form className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={q} placeholder="Search name, email, department" className="input w-72 pl-9" />
            </div>
            <button className="btn-secondary">Search</button>
          </form>
        }
      />
      <div className="card overflow-hidden p-0">
        {users.length === 0 ? <EmptyState icon={<Users />} title="No users found" /> : (
        <div className="overflow-x-auto">
        <table className="table compact">
          <thead>
            <tr><th>Name</th><th>Department</th><th>Assessments taken</th><th className="num">Passed</th><th className="num">Avg score</th><th>Joined</th><th className="act"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = sMap.get(u.id);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {u.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 font-medium">{u.name}{u.role === "ADMIN" && <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset"><ShieldCheck size={12} /> Admin</span>}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-600">{u.department ?? "—"}</td>
                  <td>
                    {(titlesByUser.get(u.id) ?? []).length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex max-w-48 flex-wrap gap-1">
                        {(titlesByUser.get(u.id) ?? []).slice(0, 2).map((t) => (
                          <span key={t} className="badge bg-slate-100 text-slate-700 ring-1 ring-slate-200 ring-inset" title={t}>{t.length > 24 ? t.slice(0, 23) + "…" : t}</span>
                        ))}
                        {(titlesByUser.get(u.id) ?? []).length > 2 && <span className="badge bg-slate-50 text-slate-500">+{(titlesByUser.get(u.id) ?? []).length - 2} more</span>}
                      </div>
                    )}
                  </td>
                  <td className="num">{pMap.get(u.id) ?? 0}</td>
                  <td className="num">{pct(s?._avg.percent)}</td>
                  <td className="whitespace-nowrap text-slate-500">{u.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="act">
                    {u.id !== me.id && (
                      <div className="flex justify-end gap-2">
                        <form action={setRoleAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                          <SubmitButton className="btn-secondary btn-sm" title={u.role === "ADMIN" ? "Make user" : "Make admin"} confirm={u.role === "ADMIN" ? `Remove admin rights from ${u.name}?` : `Make ${u.name} an admin?`}>
                            {u.role === "ADMIN" ? <><ShieldOff size={14} /> User</> : <><ShieldCheck size={14} /> Admin</>}
                          </SubmitButton>
                        </form>
                        <form action={deleteUserAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <SubmitButton className="btn-secondary btn-sm text-red-600" title="Delete user" confirm={`Delete ${u.name} and all their results?`}><Trash2 size={14} /></SubmitButton>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        )}
      </div>
    </>
  );
}
