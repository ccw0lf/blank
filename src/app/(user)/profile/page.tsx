import { Building2, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { PasswordForm, ProfileForm } from "./ProfileForms";

export default async function ProfilePage() {
  const me = await requireUser("/profile");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  return (
    <>
      <PageHeader title="Profile" description="Manage your account details and password." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card flex flex-col items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-brand-600"><UserCircle size={44} /></span>
          <p className="mt-3 text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-slate-500">{user.role === "ADMIN" ? "Administrator" : "Participant"}</p>
          <dl className="mt-5 w-full space-y-3 border-t border-slate-100 pt-4 text-left text-sm">
            <div className="flex items-center gap-2 text-slate-600"><Mail size={15} className="text-slate-400" /> {user.email}</div>
            <div className="flex items-center gap-2 text-slate-600"><Building2 size={15} className="text-slate-400" /> {user.department ?? "No department"}</div>
            <div className="flex items-center gap-2 text-slate-600"><ShieldCheck size={15} className="text-slate-400" /> Member since {fmtDate(user.createdAt)}</div>
          </dl>
        </section>
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="mb-4 font-semibold">Personal details</h2>
            <ProfileForm name={user.name} department={user.department} email={user.email} />
          </section>
          <section className="card">
            <h2 className="mb-4 font-semibold">Change password</h2>
            <PasswordForm />
          </section>
        </div>
      </div>
    </>
  );
}
