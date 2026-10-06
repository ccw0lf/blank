import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <TopBar
        user={user}
        links={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/assessments", label: "Assessments" },
          { href: "/admin/users", label: "Users" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
