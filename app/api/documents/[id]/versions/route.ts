import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { getDocumentVersions } from "@/lib/documents";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const parsed = paramsSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  try {
    const versions = await getDocumentVersions(parsed.data.id, user?.id);
    return NextResponse.json({ versions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load versions." },
      { status: 403 },
    );
  }
}
