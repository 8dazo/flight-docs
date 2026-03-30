import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { restoreDocumentVersion } from "@/lib/documents";

const paramsSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid version restore request." }, { status: 400 });
  }

  try {
    await restoreDocumentVersion(user.id, parsed.data.id, parsed.data.versionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to restore version." },
      { status: 403 },
    );
  }
}
