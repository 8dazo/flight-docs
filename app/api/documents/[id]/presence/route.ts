import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import {
  clearDocumentPresence,
  getDocumentPresence,
  upsertDocumentPresence,
} from "@/lib/documents";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  color: z.string().min(1).max(20),
  cursorX: z.number().nullable(),
  cursorY: z.number().nullable(),
  label: z.string().trim().min(1).max(120),
  sessionId: z.string().min(1).max(120),
});

const deleteSchema = z.object({
  sessionId: z.string().min(1).max(120),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ presences: [] });
  }

  const { id } = await context.params;
  const parsed = paramsSchema.safeParse({ id });
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  try {
    const presences = await getDocumentPresence(parsed.data.id, user.id, sessionId);
    return NextResponse.json({ presences });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load presence." },
      { status: 403 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = paramsSchema.safeParse({ id });
  const payload = bodySchema.safeParse(await request.json());

  if (!parsed.success || !payload.success) {
    return NextResponse.json({ error: "Invalid presence payload." }, { status: 400 });
  }

  try {
    await upsertDocumentPresence({
      color: payload.data.color,
      cursorX: payload.data.cursorX,
      cursorY: payload.data.cursorY,
      documentId: parsed.data.id,
      label: payload.data.label,
      sessionId: payload.data.sessionId,
      userId: user.id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish presence." },
      { status: 403 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: true });
  }

  const { id } = await context.params;
  const parsed = paramsSchema.safeParse({ id });
  const payload = deleteSchema.safeParse(await request.json());

  if (!parsed.success || !payload.success) {
    return NextResponse.json({ error: "Invalid presence delete request." }, { status: 400 });
  }

  await clearDocumentPresence(parsed.data.id, payload.data.sessionId);
  return NextResponse.json({ success: true });
}
