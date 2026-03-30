import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { addDocumentComment, getDocumentComments } from "@/lib/documents";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
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
    const comments = await getDocumentComments(parsed.data.id, user?.id);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load comments." },
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
  const parsedParams = paramsSchema.safeParse({ id });
  const payload = bodySchema.safeParse(await request.json());

  if (!parsedParams.success || !payload.success) {
    return NextResponse.json({ error: "Invalid comment payload." }, { status: 400 });
  }

  try {
    const comment = await addDocumentComment(user.id, parsedParams.data.id, payload.data.body);
    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add comment." },
      { status: 403 },
    );
  }
}
