"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $createHeadingNode, $isHeadingNode, HeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";

import { renameDocument, shareDocument } from "@/app/actions/documents";
import type { DocumentCollaborator } from "@/lib/documents";
import { cn, formatRelativeTime } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  collaborators: DocumentCollaborator[];
  currentUserId: string;
  document: {
    id: string;
    title: string;
    contentJson: Prisma.JsonValue;
    updatedAt: string;
  };
  owner: {
    id: string;
    email: string;
    name: string;
  };
  permissions: {
    canRename: boolean;
    canShare: boolean;
  };
};

const initialShareState = {
  error: "",
  success: false,
};

const theme = {
  heading: {
    h1: "editor-h1",
    h2: "editor-h2",
  },
  list: {
    listitem: "editor-list-item",
    nested: {
      listitem: "editor-nested-list-item",
    },
    ol: "editor-list-ol",
    ul: "editor-list-ul",
  },
  paragraph: "editor-paragraph",
  root: "editor-root",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline",
  },
};

function SaveIndicator({
  saveState,
  updatedAt,
}: {
  saveState: SaveState;
  updatedAt: string;
}) {
  const label =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : saveState === "saved"
          ? "Saved"
          : "Idle";

  return (
    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
      <span className="font-semibold text-slate-950">{label}</span>
      <span className="ml-2 hidden text-slate-500 sm:inline">
        {updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : null}
      </span>
    </div>
  );
}

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));

          const anchorNode = selection.anchor.getNode();
          const element =
            anchorNode.getKey() === "root"
              ? anchorNode
              : anchorNode.getTopLevelElementOrThrow();
          const parent = element.getParent();

          if ($isHeadingNode(element)) {
            setBlockType(element.getTag());
            return;
          }

          if ($isListNode(element)) {
            setBlockType(element.getListType());
            return;
          }

          if ($isListNode(parent)) {
            setBlockType(parent.getListType());
            return;
          }

          setBlockType("paragraph");
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => false,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-4">
      <ToolbarButton
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        Undo
      </ToolbarButton>
      <ToolbarButton
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        Redo
      </ToolbarButton>
      <ToolbarButton
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        Bold
      </ToolbarButton>
      <ToolbarButton
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        Italic
      </ToolbarButton>
      <ToolbarButton
        active={isUnderline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
      >
        Underline
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "h1"}
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode("h1"));
            }
          });
        }}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "h2"}
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode("h2"));
            }
          });
        }}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "bullet"}
        onClick={() => {
          if (blockType === "bullet") {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            return;
          }
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }}
      >
        Bullet list
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "number"}
        onClick={() => {
          if (blockType === "number") {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            return;
          }
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }}
      >
        Numbered list
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "paragraph"}
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createParagraphNode());
            }
          });
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
        }}
      >
        Paragraph
      </ToolbarButton>
      <div className="ml-auto hidden items-center gap-2 text-xs text-slate-400 sm:flex">
        <span>{canUndo ? "Undo ready" : "Undo empty"}</span>
        <span>•</span>
        <span>{canRedo ? "Redo ready" : "Redo empty"}</span>
      </div>
    </div>
  );
}

function EditorAutosavePlugin({
  documentId,
  initialSerializedState,
  setLastSavedAt,
  setSaveState,
}: {
  documentId: string;
  initialSerializedState: string;
  setLastSavedAt: Dispatch<SetStateAction<string>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
}) {
  const timerRef = useRef<number | null>(null);
  const lastPayloadRef = useRef(initialSerializedState);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        const contentJson = editorState.toJSON();
        const nextPayload = JSON.stringify(contentJson);

        if (nextPayload === lastPayloadRef.current) {
          return;
        }

        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
        }

        setSaveState("saving");

        timerRef.current = window.setTimeout(async () => {
          try {
            const response = await fetch(`/api/documents/${documentId}/content`, {
              body: JSON.stringify({ contentJson }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "PATCH",
            });

            if (!response.ok) {
              throw new Error("Save failed");
            }

            const data = (await response.json()) as { updatedAt: string };
            lastPayloadRef.current = nextPayload;
            setLastSavedAt(data.updatedAt);
            setSaveState("saved");
          } catch {
            setSaveState("error");
          }
        }, 1500);
      }}
    />
  );
}

function ShareDialog({
  collaborators,
  documentId,
  open,
  setOpen,
}: {
  collaborators: DocumentCollaborator[];
  documentId: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [state, action, pending] = useActionState(shareDocument, initialShareState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [setOpen, state.success]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white p-6 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.7)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Share document
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Invite another editor
            </h3>
          </div>
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            onClick={() => setOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>

        <form action={action} className="mt-6 space-y-4">
          <input name="documentId" type="hidden" value={documentId} />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Collaborator email
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              name="email"
              placeholder="sam@flightdocs.dev"
              required
              type="email"
            />
          </label>
          {state.error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {state.error}
            </p>
          ) : null}
          <button
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={pending}
            type="submit"
          >
            {pending ? "Sharing..." : "Add editor access"}
          </button>
        </form>

        <div className="mt-6 rounded-[1.6rem] bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Current collaborators</p>
          <div className="mt-3 space-y-3">
            {collaborators.length ? (
              collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {collaborator.user.name}
                    </p>
                    <p className="text-slate-500">{collaborator.user.email}</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900">
                    {collaborator.role}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No collaborators yet. Owners can grant editor access by email.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentEditor({
  collaborators,
  currentUserId,
  document,
  owner,
  permissions,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const [isRenamePending, startRenameTransition] = useTransition();
  const [renameError, setRenameError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState(document.updatedAt);
  const [shareOpen, setShareOpen] = useState(false);
  const ownerLabel = owner.name;
  const isOwner = owner.id === currentUserId;

  const initialConfig = useMemo(
    () => ({
      editable: true,
      editorState: JSON.stringify(document.contentJson),
      namespace: "flight-docs-editor",
      nodes: [HeadingNode, ListNode, ListItemNode],
      onError(error: Error) {
        throw error;
      },
      theme,
    }),
    [document.contentJson],
  );

  const handleTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!permissions.canRename) {
      return;
    }

    setRenameError("");

    startRenameTransition(async () => {
      try {
        await renameDocument({ documentId: document.id, title });
        router.refresh();
      } catch (error) {
        setRenameError(
          error instanceof Error ? error.message : "Unable to rename document.",
        );
      }
    });
  };

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_38%,#f8fafc_100%)] px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <header className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_28px_120px_-56px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  href="/dashboard"
                >
                  Back to dashboard
                </Link>
                <form className="space-y-3" onSubmit={handleTitleSubmit}>
                  <input
                    className={cn(
                      "w-full rounded-2xl border bg-transparent px-4 py-3 text-3xl font-semibold tracking-[-0.04em] outline-none transition sm:text-4xl",
                      permissions.canRename
                        ? "border-slate-200 text-slate-950 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        : "border-transparent px-0 text-slate-950",
                    )}
                    disabled={isRenamePending}
                    onBlur={() => {
                      if (permissions.canRename && title !== document.title) {
                        startRenameTransition(async () => {
                          try {
                            await renameDocument({ documentId: document.id, title });
                            router.refresh();
                          } catch (error) {
                            setRenameError(
                              error instanceof Error
                                ? error.message
                                : "Unable to rename document.",
                            );
                          }
                        });
                      }
                    }}
                    onChange={(event) => setTitle(event.target.value)}
                    readOnly={!permissions.canRename}
                    value={title}
                  />
                  {renameError ? (
                    <p className="text-sm text-rose-600">{renameError}</p>
                  ) : null}
                </form>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">
                    Owner: <span className="font-semibold text-slate-950">{ownerLabel}</span>
                  </span>
                  {!isOwner ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1.5 text-sky-900">
                      Shared editor access
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SaveIndicator saveState={saveState} updatedAt={lastSavedAt} />
                {permissions.canShare ? (
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                    onClick={() => setShareOpen(true)}
                    type="button"
                  >
                    Share
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_120px_-56px_rgba(15,23,42,0.5)] backdrop-blur">
            <LexicalComposer initialConfig={initialConfig}>
              <ToolbarPlugin />
              <div className="p-4 sm:p-6">
                <RichTextPlugin
                  ErrorBoundary={LexicalErrorBoundary}
                  contentEditable={
                    <ContentEditable className="min-h-[60vh] rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-base leading-8 text-slate-800 outline-none focus:border-amber-300" />
                  }
                  placeholder={
                    <div className="pointer-events-none absolute left-11 top-[8.7rem] text-slate-400">
                      Start writing. Every change autosaves in the background.
                    </div>
                  }
                />
              </div>
              <HistoryPlugin />
              <ListPlugin />
              <EditorAutosavePlugin
                documentId={document.id}
                initialSerializedState={JSON.stringify(document.contentJson)}
                setLastSavedAt={setLastSavedAt}
                setSaveState={setSaveState}
              />
            </LexicalComposer>
          </section>
        </div>
      </main>

      <ShareDialog
        key={`${document.id}-${shareOpen ? "open" : "closed"}`}
        collaborators={collaborators}
        documentId={document.id}
        open={shareOpen}
        setOpen={setShareOpen}
      />
    </>
  );
}
