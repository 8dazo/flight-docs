import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db";

const SESSION_COOKIE = "flight_docs_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      expiresAt,
      tokenHash: hashToken(token),
      userId,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.session.deleteMany({
      where: {
        tokenHash: hashToken(token),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    include: {
      user: true,
    },
    where: {
      tokenHash: hashToken(token),
    },
  });

  if (!session || session.expiresAt < new Date()) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
}
