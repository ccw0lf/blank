import { getSession } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { adminNav, userNav } from "@/lib/nav";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  // Pages redirect anonymous visitors themselves (so they can keep the ?next= link).
  if (!user) return <>{children}</>;
  const isAdmin = user.role === "ADMIN";
  return (
    <Shell user={user} groups={isAdmin ? adminNav : userNav} panel={isAdmin ? "Admin" : "Participant"}>
      {children}
    </Shell>
  );
}
