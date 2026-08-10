"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { isOwnerEmail } from "@/lib/config";
import { createSession, destroySession } from "./session";

export interface AuthState {
  error?: string;
  success?: string;
  /** Link de redefinição exibido na tela (sem serviço de e-mail configurado). */
  resetLink?: string;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe uma conta com este e-mail." };

  // Donos do app e a primeira conta criada entram como administradores;
  // as demais entram como membros e podem ser promovidas pelo admin.
  const isFirstUser = (await db.user.count()) === 0;
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: isFirstUser || isOwnerEmail(email) ? "ADMIN" : "MEMBRO",
    },
  });

  await createSession({ sub: user.id, name: user.name, email: user.email });
  redirect("/");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }

  await createSession({ sub: user.id, name: user.name, email: user.email });
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .safeParse(formData.get("email"));
  if (!email.success) return { error: "E-mail inválido" };

  const user = await db.user.findUnique({ where: { email: email.data } });
  if (!user) {
    // Não revela se o e-mail existe.
    return { success: "Se o e-mail estiver cadastrado, o link de redefinição aparecerá aqui." };
  }

  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // Sem provedor de e-mail configurado: o link é exibido diretamente.
  return {
    success: "Link de redefinição gerado (válido por 1 hora):",
    resetLink: `/redefinir-senha/${token}`,
  };
}

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await db.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createSession({
    sub: record.user.id,
    name: record.user.name,
    email: record.user.email,
  });
  redirect("/");
}
