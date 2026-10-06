import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/auth";
import { AuthForm } from "./LoginForm";
import { AuthShell } from "@/components/AuthShell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSession();
  if (user) redirect(safeNext(next, user.role === "ADMIN" ? "/admin" : "/dashboard"));
  return (
    <AuthShell title="Log in" subtitle={next?.startsWith("/a/") ? "Log in to start your assessment." : "Welcome back."}>
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
