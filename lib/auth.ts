import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, getSessionUser } from "@/lib/session";

export async function getCurrentUser() {
  return getSessionUser();
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function signInWithPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return {
      error: "Invalid email or password.",
      success: false,
    };
  }

  await createSession(user.id);

  return {
    error: "",
    success: true,
  };
}
