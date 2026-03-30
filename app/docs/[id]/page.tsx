import { getAccessibleDocument } from "@/lib/documents";
import { getCurrentUser } from "@/lib/auth";
import { DocumentEditor } from "@/components/document-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage({ params }: Props) {
  const user = await getCurrentUser();
  const { id } = await params;
  const accessibleDocument = await getAccessibleDocument(id, user?.id);

  return (
    <DocumentEditor
      collaborators={accessibleDocument.collaborators}
      currentUserId={user?.id ?? null}
      currentUserName={user?.name ?? user?.email ?? null}
      document={accessibleDocument.document}
      owner={accessibleDocument.owner}
      permissions={{
        canEdit: accessibleDocument.canEdit,
        canRename: accessibleDocument.canRename,
        canShare: accessibleDocument.canShare,
      }}
    />
  );
}
