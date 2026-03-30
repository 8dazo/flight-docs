"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, FolderOpen } from "lucide-react";
import { LexicalEditor } from "lexical";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  DEFAULT_TRANSFORMERS,
  MarkdownShortcutPlugin,
} from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

import { renameDocument } from "@/app/actions/documents";
import { InsertDialogs, ShareDialog } from "@/components/editor/dialogs";
import { ActivitySidebar } from "@/components/editor/activity-sidebar";
import { EmbedNode } from "@/components/editor/nodes/embed-node";
import { ImageNode } from "@/components/editor/nodes/image-node";
import { OutlineSidebar } from "@/components/editor/outline-sidebar";
import { PresenceOverlay } from "@/components/editor/presence-overlay";
import {
  CodeHighlightPlugin,
  EditorAutosavePlugin,
  FloatingTextToolbarPlugin,
  OutlinePlugin,
  SlashCommandPlugin,
} from "@/components/editor/plugins";
import { URL_MATCHER, editorTheme, isValidUrl } from "@/components/editor/config";
import { EditorChrome } from "@/components/editor/toolbar";
import {
  downloadDocxFile,
  downloadMarkdownFile,
  downloadPdfFile,
  downloadTextFile,
} from "@/components/editor/export";
import type {
  EditorDialogState,
  OutlineItem,
  SaveState,
  ZoomLevel,
} from "@/components/editor/types";
import { MenuDropdown, SaveIndicator } from "@/components/editor/ui";
import type { DocumentCollaborator } from "@/lib/documents";
import { cn } from "@/lib/utils";

type Props = {
  collaborators: DocumentCollaborator[];
  currentUserId: string | null;
  currentUserName: string | null;
  document: {
    id: string;
    title: string;
    contentJson: Prisma.JsonValue;
    isPublic: boolean;
    updatedAt: string;
  };
  owner: {
    id: string;
    email: string;
    name: string;
  };
  permissions: {
    canEdit: boolean;
    canRename: boolean;
    canShare: boolean;
  };
};

export function DocumentEditor({
  collaborators,
  currentUserId,
  currentUserName,
  document,
  owner,
  permissions,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<LexicalEditor | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState(document.title);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isRenamePending, startRenameTransition] = useTransition();
  const [renameError, setRenameError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState(document.updatedAt);
  const [shareOpen, setShareOpen] = useState(false);
  const [dialog, setDialog] = useState<EditorDialogState | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [markdownEnabled, setMarkdownEnabled] = useState(true);
  const pendingRenameTitleRef = useRef<string | null>(null);
  const isOwner = owner.id === currentUserId;
  const isReadOnly = !permissions.canEdit;
  const downloadItems = [
    {
      label: "Download .md",
      onSelect: () => {
        if (editorRef.current) {
          downloadMarkdownFile(editorRef.current, title);
        }
      },
    },
    {
      label: "Download .txt",
      onSelect: () => {
        if (editorRef.current) {
          downloadTextFile(editorRef.current, title);
        }
      },
    },
    {
      label: "Download .docx",
      onSelect: () => {
        if (editorRef.current) {
          void downloadDocxFile(editorRef.current, title);
        }
      },
    },
    {
      label: "Download .pdf",
      onSelect: () => {
        if (editorRef.current) {
          void downloadPdfFile(editorRef.current, title);
        }
      },
    },
  ];

  const initialConfig = useMemo(
    () => ({
      editable: permissions.canEdit,
      editorState: JSON.stringify(document.contentJson),
      namespace: "flight-docs-editor",
      nodes: [
        AutoLinkNode,
        CodeHighlightNode,
        CodeNode,
        EmbedNode,
        HeadingNode,
        HorizontalRuleNode,
        ImageNode,
        LinkNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        TableCellNode,
        TableNode,
        TableRowNode,
      ],
      onError(error: Error) {
        throw error;
      },
      theme: editorTheme,
    }),
    [document.contentJson, permissions.canEdit],
  );

  useEffect(() => {
    setTitle(document.title);
    pendingRenameTitleRef.current = null;
  }, [document.title]);

  useEffect(() => {
    setLastSavedAt(document.updatedAt);
  }, [document.updatedAt]);

  const commitTitleChange = (nextTitleRaw: string) => {
    if (!permissions.canRename) {
      return;
    }

    const nextTitle = nextTitleRaw.trim();

    if (!nextTitle) {
      setRenameError("Please provide a valid title.");
      setTitle(document.title);
      return;
    }

    if (nextTitle === document.title || pendingRenameTitleRef.current === nextTitle) {
      setRenameError("");
      setTitle(nextTitle);
      return;
    }

    setRenameError("");
    setTitle(nextTitle);
    pendingRenameTitleRef.current = nextTitle;

    startRenameTransition(async () => {
      try {
        await renameDocument({ documentId: document.id, title: nextTitle });
        router.refresh();
      } catch (error) {
        setRenameError(
          error instanceof Error ? error.message : "Unable to rename document.",
        );
      } finally {
        pendingRenameTitleRef.current = null;
      }
    });
  };

  const handleTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commitTitleChange(title);
  };

  return (
    <>
      <LexicalComposer initialConfig={initialConfig} key={`${document.id}:${document.updatedAt}`}>
        <EditorRefPlugin editorRef={editorRef} />
        <main className="h-dvh overflow-hidden bg-[linear-gradient(180deg,#eef3fb_0%,#f8fbff_45%,#f2f6fb_100%)] p-2 text-slate-950">
          <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/92 shadow-[0_40px_120px_-56px_rgba(15,23,42,0.35)] backdrop-blur">
            <header className="shrink-0 border-b border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4f46e5] text-white shadow-lg shadow-indigo-200">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <form className="min-w-[280px] max-w-[520px]" onSubmit={handleTitleSubmit}>
                        <input
                          className={cn(
                            "w-full rounded-xl border bg-transparent px-3 py-2 text-[2rem] font-semibold tracking-[-0.04em] outline-none transition",
                            permissions.canRename
                              ? "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                              : "border-transparent px-0",
                          )}
                          disabled={isRenamePending}
                          onBlur={() => {
                            if (permissions.canRename && title.trim() !== document.title) {
                              commitTitleChange(title);
                            }
                          }}
                          onChange={(event) => setTitle(event.target.value)}
                          readOnly={!permissions.canRename}
                          value={title}
                        />
                      </form>
                      <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
                        <Clock3 className="h-4 w-4" />
                        <SaveIndicator saveState={saveState} updatedAt={lastSavedAt} />
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                          Owner: {owner.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      {isReadOnly && document.isPublic ? <span>Public view access</span> : null}
                      {!isReadOnly && !isOwner ? <span>Shared editor access</span> : null}
                    </div>
                    {renameError ? <p className="text-sm text-rose-600">{renameError}</p> : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MenuDropdown
                    buttonClassName="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    items={downloadItems}
                    label="Download"
                    menuAlign="right"
                  />
                  {permissions.canShare ? (
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#4f46e5] px-5 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
                      onClick={() => setShareOpen(true)}
                      type="button"
                    >
                      Share
                    </button>
                  ) : null}
                </div>
              </div>

              {permissions.canEdit ? (
                <EditorChrome
                  markdownEnabled={markdownEnabled}
                  onMarkdownToggle={() => setMarkdownEnabled((value) => !value)}
                  onOpenDialog={setDialog}
                  setZoom={setZoom}
                  zoom={zoom}
                />
              ) : (
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
                  <span>
                    {document.isPublic
                      ? "Anyone with this link can view this document."
                      : "View-only access"}
                  </span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
              )}
            </header>

            <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
              <div className="min-h-0 overflow-hidden border-r border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                  <Link
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                    href={currentUserId ? "/dashboard" : "/"}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </div>
                <OutlineSidebar
                  items={outline}
                  onJumpToHeading={(key) => {
                    const element = editorRef.current?.getElementByKey(key);
                    element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  title={title}
                />
              </div>

              <div
                className="relative min-h-0 overflow-y-auto bg-[linear-gradient(180deg,#f6f8fc_0%,#f0f4fa_100%)] px-2 py-3 sm:px-4 sm:py-4"
                ref={previewRef}
              >
                <PresenceOverlay
                  canEdit={permissions.canEdit}
                  currentUserId={currentUserId}
                  documentId={document.id}
                  label={
                    currentUserId
                      ? owner.id === currentUserId
                        ? `${owner.name} (Owner)`
                        : currentUserName ?? "Collaborator"
                      : "Viewer"
                  }
                  previewRef={previewRef}
                />
                <div className="editor-page-shell" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                  <RichTextPlugin
                    ErrorBoundary={LexicalErrorBoundary}
                    contentEditable={
                      <ContentEditable className="editor-surface editor-page min-h-[80vh] rounded-[1.2rem] border border-slate-200 bg-white px-6 py-8 text-[15px] leading-8 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_32px_80px_-50px_rgba(15,23,42,0.22)] outline-none sm:px-10 sm:py-10 lg:px-14 lg:py-12" />
                    }
                    placeholder={<div />}
                  />
                </div>
              </div>

              <div className="min-h-0 hidden lg:block">
                <ActivitySidebar canEdit={permissions.canEdit} documentId={document.id} />
              </div>
            </section>
          </div>
        </main>

        <HistoryPlugin />
        <LinkPlugin validateUrl={isValidUrl} />
        <AutoLinkPlugin matchers={[URL_MATCHER]} />
        <ListPlugin />
        <CheckListPlugin />
        <TablePlugin hasHorizontalScroll />
        <HorizontalRulePlugin />
        <CodeHighlightPlugin />
        {permissions.canEdit ? <FloatingTextToolbarPlugin /> : null}
        {permissions.canEdit && markdownEnabled ? (
          <MarkdownShortcutPlugin transformers={DEFAULT_TRANSFORMERS} />
        ) : null}
        <OutlinePlugin onChange={setOutline} />
        {permissions.canEdit ? <SlashCommandPlugin onOpenDialog={setDialog} /> : null}
        {permissions.canEdit ? (
          <EditorAutosavePlugin
            documentId={document.id}
            initialSerializedState={JSON.stringify(document.contentJson)}
            setLastSavedAt={setLastSavedAt}
            setSaveState={setSaveState}
          />
        ) : null}
        {permissions.canEdit ? (
          <InsertDialogs dialog={dialog} onClose={() => setDialog(null)} />
        ) : null}
      </LexicalComposer>

      {permissions.canShare ? (
        <ShareDialog
          collaborators={collaborators}
          documentId={document.id}
          isPublic={document.isPublic}
          open={shareOpen}
          setOpen={setShareOpen}
        />
      ) : null}
    </>
  );
}
