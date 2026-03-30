import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { createEmptyDocumentState } from "@/lib/editor";

export type DashboardDocument = {
  access: "edit" | "owner" | "view";
  id: string;
  isPublic: boolean;
  kind: "owned" | "shared";
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
  role: "editor" | "viewer";
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export type DocumentCommentRecord = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
};

export type DocumentVersionRecord = {
  id: string;
  title: string;
  createdAt: string;
};

export type DocumentPresenceRecord = {
  color: string;
  cursorX: number | null;
  cursorY: number | null;
  label: string;
  sessionId: string;
  updatedAt: string;
  userId: string;
};

export type AccessibleDocument = {
  canEdit: boolean;
  document: {
    id: string;
    isPublic: boolean;
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
  isPublic: boolean;
  title: string;
  updatedAt: Date;
  owner: {
    id: string;
    email: string;
    name: string;
  };
}, meta: { access: "edit" | "owner" | "view"; kind: "owned" | "shared" }): DashboardDocument {
  return {
    access: meta.access,
    id: document.id,
    isPublic: document.isPublic,
    kind: meta.kind,
    owner: document.owner,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function getDashboardData(userId: string) {
  const [ownedDocuments, sharedCollaborations] = await Promise.all([
    db.document.findMany({
      select: {
        id: true,
        isPublic: true,
        owner: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
        title: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      where: {
        ownerId: userId,
      },
    }),
    db.documentCollaborator.findMany({
      select: {
        role: true,
        document: {
          select: {
            id: true,
            isPublic: true,
            owner: {
              select: {
                email: true,
                id: true,
                name: true,
              },
            },
            title: true,
            updatedAt: true,
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
    owned: ownedDocuments.map((document) =>
      normalizeDashboardDocument(document, { access: "owner", kind: "owned" }),
    ),
    shared: sharedCollaborations.map((collaboration) =>
      normalizeDashboardDocument(collaboration.document, {
        access: collaboration.role === "viewer" ? "view" : "edit",
        kind: "shared",
      }),
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
      versions: {
        create: {
          contentJson,
          createdBy: userId,
          title,
        },
      },
      ownerId: userId,
      title,
    },
    select: {
      id: true,
    },
  });

  return document.id;
}

export async function getAccessibleDocument(documentId: string, userId?: string | null) {
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
  const canViewPublicly = document.isPublic;

  if (!isOwner && !isCollaborator && !canViewPublicly) {
    notFound();
  }

  return {
    canEdit: isOwner || isCollaborator,
    canRename: isOwner,
    canShare: isOwner,
    collaborators: document.collaborators.map((collaborator) => ({
      id: collaborator.id,
      role: collaborator.role === "viewer" ? "viewer" : "editor",
      user: collaborator.user,
    })),
    document: {
      contentJson: document.contentJson,
      createdAt: document.createdAt.toISOString(),
      id: document.id,
      isPublic: document.isPublic,
      ownerId: document.ownerId,
      title: document.title,
      updatedAt: document.updatedAt.toISOString(),
    },
    owner: document.owner,
  } satisfies AccessibleDocument;
}

export async function setDocumentPublicAccess(
  userId: string,
  documentId: string,
  isPublic: boolean,
) {
  const updated = await db.document.updateMany({
    data: {
      isPublic,
    },
    where: {
      id: documentId,
      ownerId: userId,
    },
  });

  if (updated.count === 0) {
    throw new Error("Only the owner can update public access.");
  }
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
      title: true,
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
      versions: {
        create: {
          contentJson,
          createdBy: userId,
          title: accessibleDocument.title ?? "Untitled Document",
        },
      },
    },
    select: {
      updatedAt: true,
      versions: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
        take: 30,
      },
    },
    where: {
      id: documentId,
    },
  });

  const obsoleteVersions = updated.versions.slice(25);
  if (obsoleteVersions.length) {
    await db.documentVersion.deleteMany({
      where: {
        id: {
          in: obsoleteVersions.map((version) => version.id),
        },
      },
    });
  }

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

export async function getDocumentComments(documentId: string, userId?: string | null) {
  await getAccessibleDocument(documentId, userId);

  const comments = await db.documentComment.findMany({
    include: {
      author: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    where: {
      documentId,
    },
  });

  return comments.map((comment) => ({
    author: comment.author,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    id: comment.id,
    updatedAt: comment.updatedAt.toISOString(),
  })) satisfies DocumentCommentRecord[];
}

export async function addDocumentComment(userId: string, documentId: string, body: string) {
  const accessible = await getAccessibleDocument(documentId, userId);

  if (!accessible.canEdit) {
    throw new Error("Only collaborators with edit access can comment.");
  }

  const comment = await db.documentComment.create({
    data: {
      authorId: userId,
      body: body.trim(),
      documentId,
    },
    include: {
      author: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    author: comment.author,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    id: comment.id,
    updatedAt: comment.updatedAt.toISOString(),
  } satisfies DocumentCommentRecord;
}

export async function getDocumentVersions(documentId: string, userId?: string | null) {
  await getAccessibleDocument(documentId, userId);

  const versions = await db.documentVersion.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      id: true,
      title: true,
    },
    take: 25,
    where: {
      documentId,
    },
  });

  return versions.map((version) => ({
    createdAt: version.createdAt.toISOString(),
    id: version.id,
    title: version.title,
  })) satisfies DocumentVersionRecord[];
}

export async function restoreDocumentVersion(userId: string, documentId: string, versionId: string) {
  const accessible = await getAccessibleDocument(documentId, userId);

  if (!accessible.canEdit) {
    throw new Error("Only collaborators with edit access can restore versions.");
  }

  const version = await db.documentVersion.findFirst({
    where: {
      documentId,
      id: versionId,
    },
  });

  if (!version) {
    throw new Error("Version not found.");
  }

  await saveDocumentContentForUser(userId, documentId, version.contentJson as Prisma.InputJsonValue);
}

export async function upsertDocumentPresence(input: {
  color: string;
  cursorX: number | null;
  cursorY: number | null;
  documentId: string;
  label: string;
  sessionId: string;
  userId: string;
}) {
  const accessible = await getAccessibleDocument(input.documentId, input.userId);

  if (!accessible.canEdit) {
    throw new Error("Only collaborators with edit access can publish presence.");
  }

  await db.documentPresence.upsert({
    create: {
      color: input.color,
      cursorX: input.cursorX,
      cursorY: input.cursorY,
      documentId: input.documentId,
      label: input.label,
      sessionId: input.sessionId,
      userId: input.userId,
    },
    update: {
      color: input.color,
      cursorX: input.cursorX,
      cursorY: input.cursorY,
      label: input.label,
    },
    where: {
      documentId_sessionId: {
        documentId: input.documentId,
        sessionId: input.sessionId,
      },
    },
  });

  await db.documentPresence.deleteMany({
    where: {
      documentId: input.documentId,
      updatedAt: {
        lt: new Date(Date.now() - 1000 * 15),
      },
    },
  });
}

export async function clearDocumentPresence(documentId: string, sessionId: string) {
  await db.documentPresence.deleteMany({
    where: {
      documentId,
      sessionId,
    },
  });
}

export async function getDocumentPresence(documentId: string, userId: string, sessionId?: string) {
  const accessible = await getAccessibleDocument(documentId, userId);

  if (!accessible.canEdit) {
    return [];
  }

  const presence = await db.documentPresence.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      documentId,
      sessionId: sessionId
        ? {
            not: sessionId,
          }
        : undefined,
      updatedAt: {
        gte: new Date(Date.now() - 1000 * 15),
      },
    },
  });

  return presence.map((item) => ({
    color: item.color,
    cursorX: item.cursorX,
    cursorY: item.cursorY,
    label: item.label,
    sessionId: item.sessionId,
    updatedAt: item.updatedAt.toISOString(),
    userId: item.userId,
  })) satisfies DocumentPresenceRecord[];
}
