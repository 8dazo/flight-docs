"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signInWithPassword } from "@/lib/auth";
import { destroySession } from "@/lib/session";

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export async function signIn(
  _previousState: { error: string; success: boolean },
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid email and password.",
      success: false,
    };
  }

  const result = await signInWithPassword(
    parsed.data.email,
    parsed.data.password,
  );

  if (!result.success) {
    return result;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}
