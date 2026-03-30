"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  createDocumentForUser,
  createImportRecord,
  renameOwnedDocument,
  shareOwnedDocumentWithEmail,
} from "@/lib/documents";
import {
  createDocumentStateFromText,
  getTitleFromFilename,
} from "@/lib/editor";

const renameSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
});

const shareSchema = z.object({
  documentId: z.string().min(1),
  email: z.email().transform((value) => value.toLowerCase()),
});

export async function createDocument() {
  const user = await requireUser();
  const documentId = await createDocumentForUser(user.id);

  revalidatePath("/dashboard");
  redirect(`/docs/${documentId}`);
}

export async function renameDocument(input: {
  documentId: string;
  title: string;
}) {
  const parsed = renameSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Please provide a valid title.");
  }

  const user = await requireUser();
  await renameOwnedDocument(user.id, parsed.data.documentId, parsed.data.title);

  revalidatePath("/dashboard");
  revalidatePath(`/docs/${parsed.data.documentId}`);
}

export async function shareDocument(
  _previousState: { error: string; success: boolean },
  formData: FormData,
) {
  const parsed = shareSchema.safeParse({
    documentId: formData.get("documentId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email to share this document.", success: false };
  }

  try {
    const user = await requireUser();
    await shareOwnedDocumentWithEmail(
      user.id,
      parsed.data.documentId,
      parsed.data.email,
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to share document.",
      success: false,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/docs/${parsed.data.documentId}`);

  return { error: "", success: true };
}

export async function importDocumentFromFile(
  _previousState: { error: string },
  formData: FormData,
) {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Please choose a text or markdown file to import." };
  }

  const lowerName = file.name.toLowerCase();
  const validFile = lowerName.endsWith(".txt") || lowerName.endsWith(".md");

  if (!validFile) {
    return { error: "Only .txt and .md files are supported in v1." };
  }

  const text = await file.text();
  const contentJson = createDocumentStateFromText(text) as Prisma.InputJsonValue;
  const documentId = await createDocumentForUser(
    user.id,
    getTitleFromFilename(file.name),
    contentJson,
  );

  await createImportRecord({
    documentId,
    filename: file.name,
    mimeType: file.type || "text/plain",
    uploadedBy: user.id,
  });

  revalidatePath("/dashboard");
  redirect(`/docs/${documentId}`);
}
