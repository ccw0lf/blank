import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/auth";
import { AuthForm } from "../login/LoginForm";
import { AuthShell } from "@/components/AuthShell";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSession();
  if (user) redirect(safeNext(next, "/dashboard"));
  return (
    <AuthShell title="Create your account" subtitle="Register once, then use it for every training assessment.">
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
