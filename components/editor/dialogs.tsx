"use client";

import { type Dispatch, type SetStateAction, useActionState, useState } from "react";
import { LexicalEditor, $createParagraphNode, $insertNodes } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { shareDocument } from "@/app/actions/documents";
import { $createEmbedNode, type EmbedPayload } from "@/components/editor/nodes/embed-node";
import { $createImageNode, type ImagePayload } from "@/components/editor/nodes/image-node";
import { insertLink, isValidUrl, normalizeUrl } from "@/components/editor/config";
import { Modal } from "@/components/editor/ui";
import type { EditorDialogState } from "@/components/editor/types";
import type { DocumentCollaborator } from "@/lib/documents";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_TABLE_COMMAND } from "@lexical/table";

const initialShareState = {
  error: "",
  success: false,
};

export function InsertDialogs({
  dialog,
  onClose,
}: {
  dialog: EditorDialogState | null;
  onClose: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  if (!dialog) {
    return null;
  }

  if (dialog.type === "link") {
    return <LinkDialog editor={editor} initialUrl={dialog.initialUrl} onClose={onClose} />;
  }

  if (dialog.type === "image") {
    return <ImageDialog editor={editor} onClose={onClose} />;
  }

  if (dialog.type === "embed") {
    return <EmbedDialog editor={editor} onClose={onClose} />;
  }

  if (dialog.type === "table") {
    return <TableDialog editor={editor} onClose={onClose} />;
  }

  if (dialog.type === "wordCount") {
    return (
      <Modal onClose={onClose} title="Document stats">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Words</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{dialog.words}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Characters</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{dialog.characters}</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Keyboard shortcuts">
      <div className="space-y-3 text-sm text-slate-600">
        {[
          ["Bold", "Cmd/Ctrl + B"],
          ["Italic", "Cmd/Ctrl + I"],
          ["Underline", "Cmd/Ctrl + U"],
          ["Undo / Redo", "Cmd/Ctrl + Z / Shift + Cmd/Ctrl + Z"],
          ["Links", "Paste a URL or use Insert > Link"],
          ["Slash menu", "Type / inside the editor"],
        ].map(([label, shortcut]) => (
          <div
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
            key={label}
          >
            <span>{label}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-800">
              {shortcut}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function LinkDialog({
  editor,
  initialUrl,
  onClose,
}: {
  editor: LexicalEditor;
  initialUrl: string;
  onClose: () => void;
}) {
  const [linkUrl, setLinkUrl] = useState(initialUrl);

  return (
    <Modal onClose={onClose} title="Insert link">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isValidUrl(linkUrl)) {
            return;
          }
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, insertLink(linkUrl));
          onClose();
        }}
      >
        <input
          className="editor-input"
          onChange={(event) => setLinkUrl(event.target.value)}
          placeholder="https://example.com"
          type="url"
          value={linkUrl}
        />
        <button className="editor-primary-button w-full" type="submit">
          Insert link
        </button>
      </form>
    </Modal>
  );
}

function ImageDialog({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}) {
  const [image, setImage] = useState<ImagePayload>({ altText: "", caption: "", src: "" });

  return (
    <Modal onClose={onClose} title="Insert image from URL">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isValidUrl(image.src)) {
            return;
          }

          editor.update(() => {
            $insertNodes([
              $createImageNode({
                altText: image.altText,
                caption: image.caption,
                src: normalizeUrl(image.src),
              }),
              $createParagraphNode(),
            ]);
          });
          onClose();
        }}
      >
        <input
          className="editor-input"
          onChange={(event) => setImage((value) => ({ ...value, src: event.target.value }))}
          placeholder="https://images.example.com/flight.jpg"
          type="url"
          value={image.src}
        />
        <input
          className="editor-input"
          onChange={(event) => setImage((value) => ({ ...value, altText: event.target.value }))}
          placeholder="Alt text"
          type="text"
          value={image.altText}
        />
        <input
          className="editor-input"
          onChange={(event) => setImage((value) => ({ ...value, caption: event.target.value }))}
          placeholder="Caption"
          type="text"
          value={image.caption}
        />
        <button className="editor-primary-button w-full" type="submit">
          Insert image
        </button>
      </form>
    </Modal>
  );
}

function EmbedDialog({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}) {
  const [embed, setEmbed] = useState<EmbedPayload>({ title: "", url: "" });

  return (
    <Modal onClose={onClose} title="Insert embed">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isValidUrl(embed.url)) {
            return;
          }

          editor.update(() => {
            $insertNodes([
              $createEmbedNode({
                title: embed.title,
                url: normalizeUrl(embed.url),
              }),
              $createParagraphNode(),
            ]);
          });
          onClose();
        }}
      >
        <input
          className="editor-input"
          onChange={(event) => setEmbed((value) => ({ ...value, url: event.target.value }))}
          placeholder="YouTube, Figma, or any URL"
          type="url"
          value={embed.url}
        />
        <input
          className="editor-input"
          onChange={(event) => setEmbed((value) => ({ ...value, title: event.target.value }))}
          placeholder="Optional title"
          type="text"
          value={embed.title}
        />
        <button className="editor-primary-button w-full" type="submit">
          Insert embed
        </button>
      </form>
    </Modal>
  );
}

function TableDialog({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}) {
  const [tableRows, setTableRows] = useState("3");
  const [tableColumns, setTableColumns] = useState("3");

  return (
    <Modal onClose={onClose} title="Insert table">
      <form
        className="grid grid-cols-2 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: tableColumns,
            rows: tableRows,
          });
          onClose();
        }}
      >
        <label className="space-y-2 text-sm text-slate-600">
          <span>Rows</span>
          <input
            className="editor-input"
            min="1"
            onChange={(event) => setTableRows(event.target.value)}
            type="number"
            value={tableRows}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-600">
          <span>Columns</span>
          <input
            className="editor-input"
            min="1"
            onChange={(event) => setTableColumns(event.target.value)}
            type="number"
            value={tableColumns}
          />
        </label>
        <button className="editor-primary-button col-span-2 w-full" type="submit">
          Insert table
        </button>
      </form>
    </Modal>
  );
}

export function ShareDialog({
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

  if (!open) {
    return null;
  }

  return (
    <Modal onClose={() => setOpen(false)} title="Share document">
      <form action={action} className="space-y-4">
        <input name="documentId" type="hidden" value={documentId} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Collaborator email</span>
          <input
            className="editor-input"
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
        <button className="editor-primary-button w-full" disabled={pending} type="submit">
          {pending ? "Sharing..." : "Add editor access"}
        </button>
      </form>

      <div className="mt-6 rounded-[1.6rem] bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">Current collaborators</p>
        <div className="mt-3 space-y-3">
          {collaborators.length ? (
            collaborators.map((collaborator) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                key={collaborator.id}
              >
                <div>
                  <p className="font-medium text-slate-950">{collaborator.user.name}</p>
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
    </Modal>
  );
}
