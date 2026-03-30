import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { isSerializedDocumentState } from "@/lib/editor";
import { saveDocumentContentForUser } from "@/lib/documents";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsedParams = paramsSchema.safeParse({ id });

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  const payload = await request.json();

  if (!isSerializedDocumentState(payload?.contentJson)) {
    return NextResponse.json(
      { error: "Invalid editor payload." },
      { status: 400 },
    );
  }

  try {
    const updatedAt = await saveDocumentContentForUser(
      user.id,
      parsedParams.data.id,
      payload.contentJson as Prisma.InputJsonValue,
    );

    return NextResponse.json({ updatedAt });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save document.",
      },
      { status: 403 },
    );
  }
}
