"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionForm } from "@/components/ActionForm";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action] = useActionState(mode === "login" ? loginAction : registerAction, undefined);
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <ActionForm action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" className="input" required autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="department">Department / Team <span className="text-slate-400">(optional)</span></label>
            <input id="department" name="department" className="input" />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText={mode === "login" ? "Signing in…" : "Creating account…"}>
        {mode === "login" ? "Log in" : "Create account"}
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        {mode === "login" ? (
          <>New here? <Link className="font-medium text-brand-600 hover:underline" href={`/register${q}`}>Create an account</Link></>
        ) : (
          <>Already registered? <Link className="font-medium text-brand-600 hover:underline" href={`/login${q}`}>Log in</Link></>
        )}
      </p>
    </ActionForm>
  );
}
