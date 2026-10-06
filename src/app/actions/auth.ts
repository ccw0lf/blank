"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, safeNext, verifyPassword, type Role } from "@/lib/auth";
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
