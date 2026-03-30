"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Columns2,
  Heading1,
  Highlighter,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Palette,
  Redo2,
  Share2,
  SquareDashedMousePointer,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Undo2,
  Video,
  WrapText,
} from "lucide-react";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $isCodeNode, $createCodeNode } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findTableNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
} from "@lexical/table";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { mergeRegister } from "@lexical/utils";

import {
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_TEXT_COLOR,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  ZOOM_LEVELS,
} from "@/components/editor/config";
import type { EditorDialogState, ToolbarState, ZoomLevel } from "@/components/editor/types";
import {
  ColorControl,
  IconAction,
  MenuDropdown,
  SelectControl,
  ToolbarDivider,
} from "@/components/editor/ui";
import { createDocument } from "@/app/actions/documents";

function getBlockTypeFromSelection() {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return "paragraph" as ToolbarState["blockType"];
  }

  const anchorNode = selection.anchor.getNode();
  const element =
    anchorNode.getKey() === "root"
      ? anchorNode
      : $isElementNode(anchorNode)
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
  const parent = element.getParent();

  if ($isHeadingNode(element)) {
    return element.getTag() as ToolbarState["blockType"];
  }

  if ($isQuoteNode(element)) {
    return "quote";
  }

  if ($isCodeNode(element)) {
    return "code";
  }

  if ($isListNode(element)) {
    return element.getListType() as ToolbarState["blockType"];
  }

  if ($isListNode(parent)) {
    return parent.getListType() as ToolbarState["blockType"];
  }

  return "paragraph";
}

export function EditorToolbar({
  markdownEnabled,
  onMarkdownToggle,
  onOpenDialog,
  onShowWordCount,
  zoom,
}: {
  markdownEnabled: boolean;
  onMarkdownToggle: () => void;
  onOpenDialog: (dialog: EditorDialogState) => void;
  onShowWordCount: () => void;
  zoom: ZoomLevel;
}) {
  const [editor] = useLexicalComposerContext();
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    blockType: "paragraph",
    canRedo: false,
    canUndo: false,
    fontFamily: "Arial",
    fontSize: "15px",
    highlightColor: DEFAULT_HIGHLIGHT_COLOR,
    isBold: false,
    isCode: false,
    isItalic: false,
    isLink: false,
    isStrikethrough: false,
    isSubscript: false,
    isSuperscript: false,
    isTable: false,
    isUnderline: false,
    textColor: DEFAULT_TEXT_COLOR,
  });

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          const anchorNode = selection.anchor.getNode();
          const selectedNode = selection.getNodes()[0] ?? anchorNode;
          const topLevel = selectedNode.getTopLevelElementOrThrow();
          const nearestTable = $findTableNode(topLevel);
          const blockType = getBlockTypeFromSelection();
          const fontFamily = $getSelectionStyleValueForProperty(selection, "font-family", "Arial");
          const fontSize = $getSelectionStyleValueForProperty(selection, "font-size", "15px");
          const highlightColor = $getSelectionStyleValueForProperty(
            selection,
            "background-color",
            DEFAULT_HIGHLIGHT_COLOR,
          );
          const textColor = $getSelectionStyleValueForProperty(
            selection,
            "color",
            DEFAULT_TEXT_COLOR,
          );
          const isLink = $isLinkNode(anchorNode.getParent()) || $isLinkNode(anchorNode);

          setToolbarState((previous) => ({
            ...previous,
            blockType,
            fontFamily,
            fontSize,
            highlightColor,
            isBold: selection.hasFormat("bold"),
            isCode: selection.hasFormat("code"),
            isItalic: selection.hasFormat("italic"),
            isLink,
            isStrikethrough: selection.hasFormat("strikethrough"),
            isSubscript: selection.hasFormat("subscript"),
            isSuperscript: selection.hasFormat("superscript"),
            isTable: Boolean(nearestTable),
            isUnderline: selection.hasFormat("underline"),
            textColor,
          }));
        });
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setToolbarState((previous) => ({ ...previous, canUndo: payload }));
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setToolbarState((previous) => ({ ...previous, canRedo: payload }));
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, () => false, COMMAND_PRIORITY_LOW),
    );
  }, [editor]);

  const applyTextStyle = useCallback(
    (property: string, value: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, { [property]: value });
        }
      });
    },
    [editor],
  );

  const setBlock = useCallback(
    (block: ToolbarState["blockType"]) => {
      if (block === "bullet") {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        return;
      }
      if (block === "number") {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        return;
      }
      if (block === "check") {
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        return;
      }

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        if (block === "paragraph") {
          $setBlocksType(selection, () => $createParagraphNode());
          return;
        }

        if (block === "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
          return;
        }

        if (block === "code") {
          $setBlocksType(selection, () => $createCodeNode());
          return;
        }

        $setBlocksType(selection, () => $createHeadingNode(block));
      });
    },
    [editor],
  );

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="editor-toolbar-row">
        <IconAction disabled={!toolbarState.canUndo} label="Undo" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
          <Undo2 className="h-4 w-4" />
        </IconAction>
        <IconAction disabled={!toolbarState.canRedo} label="Redo" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
          <Redo2 className="h-4 w-4" />
        </IconAction>
        <ToolbarDivider />
        <SelectControl
          onChange={(value) => setBlock(value as ToolbarState["blockType"])}
          options={["paragraph", "h1", "h2", "h3", "quote", "code"]}
          value={toolbarState.blockType}
          widthClass="w-[150px]"
        />
        <SelectControl
          onChange={(value) => applyTextStyle("font-family", value)}
          options={FONT_FAMILY_OPTIONS}
          value={toolbarState.fontFamily}
          widthClass="w-[120px]"
        />
        <SelectControl
          onChange={(value) => applyTextStyle("font-size", value)}
          options={FONT_SIZE_OPTIONS}
          value={toolbarState.fontSize}
          widthClass="w-[84px]"
        />
        <ToolbarDivider />
        <IconAction active={toolbarState.isBold} label="Bold" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
          <Bold className="h-4 w-4" />
        </IconAction>
        <IconAction active={toolbarState.isItalic} label="Italic" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
          <Italic className="h-4 w-4" />
        </IconAction>
        <IconAction active={toolbarState.isUnderline} label="Underline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}>
          <Underline className="h-4 w-4" />
        </IconAction>
        <IconAction active={toolbarState.isStrikethrough} label="Strikethrough" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}>
          <Strikethrough className="h-4 w-4" />
        </IconAction>
        <ColorControl icon={<Palette className="h-4 w-4" />} onChange={(value) => applyTextStyle("color", value)} value={toolbarState.textColor} />
        <ColorControl icon={<Highlighter className="h-4 w-4" />} onChange={(value) => applyTextStyle("background-color", value)} value={toolbarState.highlightColor} />
        <ToolbarDivider />
        <IconAction active={toolbarState.isLink} label="Link" onClick={() => (toolbarState.isLink ? editor.dispatchCommand(TOGGLE_LINK_COMMAND, null) : onOpenDialog({ initialUrl: "", type: "link" }))}>
          <Link2 className="h-4 w-4" />
        </IconAction>
        <IconAction label="Insert image" onClick={() => onOpenDialog({ type: "image" })}>
          <ImageIcon className="h-4 w-4" />
        </IconAction>
        <IconAction label="Insert embed" onClick={() => onOpenDialog({ type: "embed" })}>
          <Video className="h-4 w-4" />
        </IconAction>
        <ToolbarDivider />
        <IconAction active={toolbarState.blockType === "bullet"} label="Bulleted list" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
          <List className="h-4 w-4" />
        </IconAction>
        <IconAction active={toolbarState.blockType === "number"} label="Numbered list" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
          <ListOrdered className="h-4 w-4" />
        </IconAction>
        <IconAction active={toolbarState.blockType === "check"} label="Checklist" onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}>
          <ListChecks className="h-4 w-4" />
        </IconAction>
        <ToolbarDivider />
        <IconAction label="Align left" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}>
          <Columns2 className="h-4 w-4 rotate-90" />
        </IconAction>
        <IconAction label="Align center" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}>
          <Columns2 className="h-4 w-4" />
        </IconAction>
        <IconAction label="Align justify" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}>
          <WrapText className="h-4 w-4" />
        </IconAction>
        <IconAction label="Indent" onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
          <IndentIncrease className="h-4 w-4" />
        </IconAction>
        <IconAction label="Outdent" onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
          <IndentDecrease className="h-4 w-4" />
        </IconAction>
        <ToolbarDivider />
        <IconAction label="Subscript" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript")}>
          <Subscript className="h-4 w-4" />
        </IconAction>
        <IconAction label="Superscript" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript")}>
          <Superscript className="h-4 w-4" />
        </IconAction>
        <IconAction label="Divider" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
          <Minus className="h-4 w-4" />
        </IconAction>
        <IconAction label="Insert table" onClick={() => onOpenDialog({ type: "table" })}>
          <Table2 className="h-4 w-4" />
        </IconAction>
        {toolbarState.isTable ? (
          <>
            <ToolbarDivider />
            <IconAction label="Insert row below" onClick={() => editor.update(() => $insertTableRowAtSelection())}>
              <Heading1 className="h-4 w-4" />
            </IconAction>
            <IconAction label="Insert column" onClick={() => editor.update(() => $insertTableColumnAtSelection())}>
              <Columns2 className="h-4 w-4" />
            </IconAction>
            <IconAction label="Delete row" onClick={() => editor.update(() => $deleteTableRowAtSelection())}>
              <Minus className="h-4 w-4" />
            </IconAction>
            <IconAction label="Delete column" onClick={() => editor.update(() => $deleteTableColumnAtSelection())}>
              <SquareDashedMousePointer className="h-4 w-4" />
            </IconAction>
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>{Math.round(zoom * 100)}%</span>
          <span>•</span>
          <button className="hover:text-slate-900" onClick={onMarkdownToggle} type="button">
            Markdown {markdownEnabled ? "on" : "off"}
          </button>
          <span>•</span>
          <button className="hover:text-slate-900" onClick={onShowWordCount} type="button">
            Word count
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditorChrome({
  markdownEnabled,
  onMarkdownToggle,
  onOpenDialog,
  setZoom,
  zoom,
}: {
  markdownEnabled: boolean;
  onMarkdownToggle: () => void;
  onOpenDialog: (dialog: EditorDialogState) => void;
  setZoom: (zoom: ZoomLevel) => void;
  zoom: ZoomLevel;
}) {
  const [editor] = useLexicalComposerContext();
  const newDocumentFormRef = useRef<HTMLFormElement | null>(null);

  const handleShowWordCount = useCallback(() => {
    const counts = editor.getEditorState().read(() => {
      const text = $getRoot().getTextContent().trim();
      return {
        characters: text.length,
        words: text ? text.split(/\s+/).length : 0,
      };
    });

    onOpenDialog({ ...counts, type: "wordCount" });
  }, [editor, onOpenDialog]);

  const viewMenu = useMemo(
    () =>
      ZOOM_LEVELS.map((level) => ({
        label: `Zoom ${Math.round(level * 100)}%`,
        onSelect: () => setZoom(level),
      })),
    [setZoom],
  );

  const fileMenu = [
    { label: "New document", onSelect: () => newDocumentFormRef.current?.requestSubmit() },
    { label: "Print", onSelect: () => window.print() },
    {
      label: "Copy document link",
      onSelect: async () => navigator.clipboard.writeText(window.location.href),
    },
  ];

  const editMenu = [
    { label: "Undo", onSelect: () => editor.dispatchCommand(UNDO_COMMAND, undefined) },
    { label: "Redo", onSelect: () => editor.dispatchCommand(REDO_COMMAND, undefined) },
    { label: "Select all", onSelect: () => document.execCommand("selectAll") },
  ];

  const insertMenu = [
    { label: "Link", onSelect: () => onOpenDialog({ initialUrl: "", type: "link" }) },
    { label: "Image from URL", onSelect: () => onOpenDialog({ type: "image" }) },
    { label: "Embed URL", onSelect: () => onOpenDialog({ type: "embed" }) },
    { label: "Table", onSelect: () => onOpenDialog({ type: "table" }) },
    { label: "Divider", onSelect: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined) },
  ];

  const formatMenu = [
    { label: "Heading 1", onSelect: () => editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h1"));
      }
    }) },
    { label: "Heading 2", onSelect: () => editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      }
    }) },
    { label: "Heading 3", onSelect: () => editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h3"));
      }
    }) },
  ];

  const toolsMenu = [
    { label: "Word count", onSelect: handleShowWordCount },
    { label: markdownEnabled ? "Disable markdown shortcuts" : "Enable markdown shortcuts", onSelect: onMarkdownToggle },
  ];

  const helpMenu = [
    { label: "Keyboard shortcuts", onSelect: () => onOpenDialog({ type: "shortcuts" }) },
  ];

  return (
    <>
      <form action={createDocument} className="hidden" ref={newDocumentFormRef} />
      <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 px-4 py-2">
        <MenuDropdown items={fileMenu} label="File" />
        <MenuDropdown items={editMenu} label="Edit" />
        <MenuDropdown items={viewMenu} label="View" />
        <MenuDropdown items={insertMenu} label="Insert" />
        <MenuDropdown items={formatMenu} label="Format" />
        <MenuDropdown items={toolsMenu} label="Tools" />
        <MenuDropdown items={helpMenu} label="Help" />
      </div>
      <EditorToolbar
        markdownEnabled={markdownEnabled}
        onMarkdownToggle={onMarkdownToggle}
        onOpenDialog={onOpenDialog}
        onShowWordCount={handleShowWordCount}
        zoom={zoom}
      />
    </>
  );
}

export function EditorHeader({
  canShare,
  onShare,
  saveState,
  title,
  updatedAt,
}: {
  canShare: boolean;
  onShare: () => void;
  saveState: string;
  title: string;
  updatedAt: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
      <div className="flex items-center gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4f46e5] text-white shadow-lg shadow-indigo-200">
          <Heading1 className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {title || "Untitled Document"}
          </h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">Draft workspace</span>
            <span>{updatedAt}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          {saveState}
        </div>
        {canShare ? (
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#4f46e5] px-5 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
            onClick={onShare}
            type="button"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </button>
        ) : null}
      </div>
    </div>
  );
}
