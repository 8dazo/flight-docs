import { getAccessibleDocument } from "@/lib/documents";
import { requireUser } from "@/lib/auth";
import { DocumentEditor } from "@/components/document-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const accessibleDocument = await getAccessibleDocument(id, user.id);

  return (
    <DocumentEditor
      collaborators={accessibleDocument.collaborators}
      currentUserId={user.id}
      document={accessibleDocument.document}
      owner={accessibleDocument.owner}
      permissions={{
        canRename: accessibleDocument.canRename,
        canShare: accessibleDocument.canShare,
      }}
    />
  );
}
