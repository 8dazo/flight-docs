import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { createEmptyDocumentState } from "@/lib/editor";

export type DashboardDocument = {
  id: string;
  title: string;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    name: string;
  };
};

export type DocumentCollaborator = {
  id: string;
  role: "editor";
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export type AccessibleDocument = {
  document: {
    id: string;
    title: string;
    contentJson: Prisma.JsonValue;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    id: string;
    email: string;
    name: string;
  };
  collaborators: DocumentCollaborator[];
  canShare: boolean;
  canRename: boolean;
};

function normalizeDashboardDocument(document: {
  id: string;
  title: string;
  updatedAt: Date;
  owner: {
    id: string;
    email: string;
    name: string;
  };
}): DashboardDocument {
  return {
    id: document.id,
    owner: document.owner,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function getDashboardData(userId: string) {
  const [ownedDocuments, sharedCollaborations] = await Promise.all([
    db.document.findMany({
      include: {
        owner: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      where: {
        ownerId: userId,
      },
    }),
    db.documentCollaborator.findMany({
      include: {
        document: {
          include: {
            owner: {
              select: {
                email: true,
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        document: {
          updatedAt: "desc",
        },
      },
      where: {
        userId,
      },
    }),
  ]);

  return {
    owned: ownedDocuments.map(normalizeDashboardDocument),
    shared: sharedCollaborations.map((collaboration) =>
      normalizeDashboardDocument(collaboration.document),
    ),
  };
}

export async function createDocumentForUser(
  userId: string,
  title = "Untitled Document",
  contentJson: Prisma.InputJsonValue = createEmptyDocumentState(),
) {
  const document = await db.document.create({
    data: {
      contentJson,
      ownerId: userId,
      title,
    },
    select: {
      id: true,
    },
  });

  return document.id;
}

export async function getAccessibleDocument(documentId: string, userId: string) {
  const document = await db.document.findUnique({
    include: {
      collaborators: {
        include: {
          user: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
        },
      },
      owner: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
    where: {
      id: documentId,
    },
  });

  if (!document) {
    notFound();
  }

  const isOwner = document.ownerId === userId;
  const isCollaborator = document.collaborators.some(
    (collaborator) => collaborator.userId === userId,
  );

  if (!isOwner && !isCollaborator) {
    notFound();
  }

  return {
    canRename: isOwner,
    canShare: isOwner,
    collaborators: document.collaborators.map((collaborator) => ({
      id: collaborator.id,
      role: "editor",
      user: collaborator.user,
    })),
    document: {
      contentJson: document.contentJson,
      createdAt: document.createdAt.toISOString(),
      id: document.id,
      ownerId: document.ownerId,
      title: document.title,
      updatedAt: document.updatedAt.toISOString(),
    },
    owner: document.owner,
  } satisfies AccessibleDocument;
}

export async function renameOwnedDocument(
  userId: string,
  documentId: string,
  title: string,
) {
  const updated = await db.document.updateMany({
    data: {
      title: title.trim() || "Untitled Document",
    },
    where: {
      id: documentId,
      ownerId: userId,
    },
  });

  if (updated.count === 0) {
    throw new Error("Unable to rename document.");
  }
}

export async function saveDocumentContentForUser(
  userId: string,
  documentId: string,
  contentJson: Prisma.InputJsonValue,
) {
  const accessibleDocument = await db.document.findFirst({
    select: {
      id: true,
    },
    where: {
      id: documentId,
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
  });

  if (!accessibleDocument) {
    throw new Error("You do not have access to edit this document.");
  }

  const updated = await db.document.update({
    data: {
      contentJson,
    },
    select: {
      updatedAt: true,
    },
    where: {
      id: documentId,
    },
  });

  return updated.updatedAt.toISOString();
}

export async function shareOwnedDocumentWithEmail(
  userId: string,
  documentId: string,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const ownerDocument = await db.document.findFirst({
    select: {
      id: true,
    },
    where: {
      id: documentId,
      ownerId: userId,
    },
  });

  if (!ownerDocument) {
    throw new Error("Only the owner can share this document.");
  }

  const targetUser = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!targetUser) {
    throw new Error("No Flight Docs user was found with that email.");
  }

  if (targetUser.id === userId) {
    throw new Error("You already own this document.");
  }

  await db.documentCollaborator.upsert({
    create: {
      documentId,
      role: "editor",
      userId: targetUser.id,
    },
    update: {
      role: "editor",
    },
    where: {
      documentId_userId: {
        documentId,
        userId: targetUser.id,
      },
    },
  });
}

export async function createImportRecord(params: {
  documentId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
}) {
  await db.documentImport.create({
    data: {
      documentId: params.documentId,
      filename: params.filename,
      mimeType: params.mimeType,
      uploadedBy: params.uploadedBy,
    },
  });
}
