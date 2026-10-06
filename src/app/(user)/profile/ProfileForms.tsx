"use client";
import { useActionState } from "react";
import { KeyRound, Save } from "lucide-react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionForm } from "@/components/ActionForm";

export function ProfileForm({ name, department, email }: { name: string; department: string | null; email: string }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  return (
    <ActionForm action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="pname">Full name</label>
        <input id="pname" name="name" className="input" defaultValue={name} required />
      </div>
      <div>
        <label className="label" htmlFor="pemail">Email</label>
        <input id="pemail" className="input bg-slate-50 text-slate-500" value={email} disabled readOnly />
      </div>
      <div>
        <label className="label" htmlFor="pdept">Department / Team</label>
        <input id="pdept" name="department" className="input" defaultValue={department ?? ""} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…"><Save size={16} /> Save changes</SubmitButton>
    </ActionForm>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <ActionForm action={action} className="space-y-4" autoComplete="off">
      <div>
        <label className="label" htmlFor="cur">Current password</label>
        <input id="cur" name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label" htmlFor="new">New password</label>
        <input id="new" name="next" type="password" className="input" autoComplete="new-password" required />
      </div>
      <div>
        <label className="label" htmlFor="conf">Confirm new password</label>
        <input id="conf" name="confirm" type="password" className="input" autoComplete="new-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Updating…"><KeyRound size={16} /> Change password</SubmitButton>
    </ActionForm>
  );
}
