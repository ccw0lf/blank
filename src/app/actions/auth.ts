"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, requireUser, safeNext, verifyPassword, type Role } from "@/lib/auth";
import type { FormState } from "@/components/FormMessage";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return { error: "Invalid email or password." };
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role as Role });
  redirect(safeNext(fd.get("next"), user.role === "ADMIN" ? "/admin" : "/dashboard"));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  department: z.string().trim().max(100).optional(),
  password: z.string().min(6, "Password must be at least 6 characters.").max(100),
});

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, department, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } }))
    return { error: "An account with this email already exists. Please log in." };
  const user = await prisma.user.create({
    data: { name, email, department: department || null, passwordHash: await hashPassword(password) },
  });
  await createSession({ id: user.id, name: user.name, email: user.email, role: "USER" });
  redirect(safeNext(fd.get("next"), "/dashboard"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ------------------------------- Profile ------------------------------- */

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser("/profile");
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
      department: z.string().trim().max(100).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.user.update({
    where: { id: me.id },
    data: { name: parsed.data.name, department: parsed.data.department || null },
  });
  return { success: "Profile updated." };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser("/profile");
  const parsed = z
    .object({
      current: z.string().min(1, "Enter your current password."),
      next: z.string().min(6, "New password must be at least 6 characters.").max(100),
      confirm: z.string(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.next !== parsed.data.confirm) return { error: "New passwords don't match." };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return { error: "Current password is incorrect." };
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  return { success: "Password changed." };
}
