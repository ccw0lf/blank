import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, pct } from "@/lib/utils";
import { deleteUserAction, setRoleAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";

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
  const sMap = new Map(stats.map((s) => [s.userId, s]));
  const pMap = new Map(passes.map((p) => [p.userId, p._count._all]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Users</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, email, department" className="input w-64" />
          <button className="btn-secondary">Search</button>
        </form>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Department</th><th>Role</th><th>Assessments</th><th>Passed</th><th>Avg score</th><th>Joined</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = sMap.get(u.id);
              return (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="text-slate-600">{u.department ?? "—"}</td>
                  <td>{u.role === "ADMIN" ? <span className="badge bg-amber-100 text-amber-800">Admin</span> : <span className="badge bg-slate-100 text-slate-700">User</span>}</td>
                  <td className="tabular-nums">{s?._count._all ?? 0}</td>
                  <td className="tabular-nums">{pMap.get(u.id) ?? 0}</td>
                  <td className="tabular-nums">{pct(s?._avg.percent)}</td>
                  <td className="whitespace-nowrap text-slate-500">{fmtDate(u.createdAt)}</td>
                  <td>
                    {u.id !== me.id && (
                      <div className="flex justify-end gap-2">
                        <form action={setRoleAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                          <SubmitButton className="btn-secondary btn-sm" confirm={u.role === "ADMIN" ? `Remove admin rights from ${u.name}?` : `Make ${u.name} an admin?`}>
                            {u.role === "ADMIN" ? "Make user" : "Make admin"}
                          </SubmitButton>
                        </form>
                        <form action={deleteUserAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <SubmitButton className="btn-secondary btn-sm text-red-600" confirm={`Delete ${u.name} and all their results?`}>Delete</SubmitButton>
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
    </div>
  );
}
