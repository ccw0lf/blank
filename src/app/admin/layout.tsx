import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <Shell user={user} groups={adminNav} panel="Admin">
      {children}
    </Shell>
  );
}
