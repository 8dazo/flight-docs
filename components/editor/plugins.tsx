"use client";

import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Link2, Trash2, Underline } from "lucide-react";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { $createCodeNode, registerCodeHighlighting } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from "@lexical/rich-text";
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { mergeRegister } from "@lexical/utils";

import type { EditorDialogState, OutlineItem, SaveState } from "@/components/editor/types";
import { isValidUrl, normalizeUrl } from "@/components/editor/config";
import { cn } from "@/lib/utils";

export function EditorAutosavePlugin({
  documentId,
  initialSerializedState,
  setLastSavedAt,
  setSaveState,
}: {
  documentId: string;
  initialSerializedState: string;
  setLastSavedAt: (value: string) => void;
  setSaveState: (value: SaveState) => void;
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
        }, 1000);
      }}
    />
  );
}

export function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => registerCodeHighlighting(editor), [editor]);

  return null;
}

class SlashCommandOption extends MenuOption {
  icon: JSX.Element;
  keywords: string[];
  title: string;
  onSelectAction: () => void;

  constructor(
    title: string,
    options: {
      icon: JSX.Element;
      keywords?: string[];
      onSelectAction: () => void;
    },
  ) {
    super(title);
    this.title = title;
    this.icon = options.icon;
    this.keywords = options.keywords ?? [];
    this.onSelectAction = options.onSelectAction;
  }
}

export function SlashCommandPlugin({
  onOpenDialog,
}: {
  onOpenDialog: (dialog: EditorDialogState) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    allowWhitespace: true,
    minLength: 0,
  });

  const options = useMemo(() => {
    const makeBlock = (fn: () => void) => () => editor.update(fn);
    const baseOptions = [
      new SlashCommandOption("Paragraph", {
        icon: <span>P</span>,
        keywords: ["text", "body"],
        onSelectAction: makeBlock(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        }),
      }),
      new SlashCommandOption("Heading 1", {
        icon: <span>H1</span>,
        onSelectAction: makeBlock(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode("h1"));
          }
        }),
      }),
      new SlashCommandOption("Heading 2", {
        icon: <span>H2</span>,
        onSelectAction: makeBlock(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode("h2"));
          }
        }),
      }),
      new SlashCommandOption("Heading 3", {
        icon: <span>H3</span>,
        onSelectAction: makeBlock(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode("h3"));
          }
        }),
      }),
      new SlashCommandOption("Quote", {
        icon: <span>Q</span>,
        onSelectAction: makeBlock(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
      }),
      new SlashCommandOption("Code block", {
        icon: <span>{"</>"}</span>,
        onSelectAction: makeBlock(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createCodeNode());
          }
        }),
      }),
      new SlashCommandOption("Bulleted list", {
        icon: <span>•</span>,
        onSelectAction: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
      }),
      new SlashCommandOption("Numbered list", {
        icon: <span>1.</span>,
        onSelectAction: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
      }),
      new SlashCommandOption("Checklist", {
        icon: <span>☑</span>,
        onSelectAction: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
      }),
      new SlashCommandOption("Divider", {
        icon: <span>—</span>,
        onSelectAction: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
      }),
      new SlashCommandOption("Table", {
        icon: <span>▦</span>,
        onSelectAction: () => onOpenDialog({ type: "table" }),
      }),
      new SlashCommandOption("Image", {
        icon: <span>🖼</span>,
        onSelectAction: () => onOpenDialog({ type: "image" }),
      }),
      new SlashCommandOption("Embed", {
        icon: <span>↗</span>,
        onSelectAction: () => onOpenDialog({ type: "embed" }),
      }),
    ];

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, "i");
    return baseOptions.filter(
      (option) =>
        regex.test(option.title) ||
        option.keywords.some((keyword) => regex.test(keyword)),
    );
  }, [editor, onOpenDialog, queryString]);

  return (
    <LexicalTypeaheadMenuPlugin<SlashCommandOption>
      onQueryChange={setQueryString}
      onSelectOption={(option, nodeToRemove, closeMenu) => {
        editor.update(() => {
          nodeToRemove?.remove();
          option.onSelectAction();
          closeMenu();
        });
      }}
      options={options}
      triggerFn={checkForTriggerMatch}
      menuRenderFn={(anchorRef, { selectOptionAndCleanUp, selectedIndex, setHighlightedIndex }) =>
        anchorRef.current && options.length ? (
          <div className="editor-slash-menu">
            {options.map((option, index) => (
              <button
                className={cn(
                  "editor-slash-option",
                  selectedIndex === index && "editor-slash-option-active",
                )}
                key={option.key}
                onClick={() => selectOptionAndCleanUp(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                ref={index === 0 ? (element) => void element : undefined}
                type="button"
              >
                <span className="editor-slash-icon">{option.icon}</span>
                <span>{option.title}</span>
              </button>
            ))}
          </div>
        ) : null
      }
    />
  );
}

export function OutlinePlugin({
  onChange,
}: {
  onChange: (items: OutlineItem[]) => void;
}) {
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        const nextOutline = editorState.read(() => {
          const items: OutlineItem[] = [];
          for (const node of $getRoot().getChildren()) {
            if ($isHeadingNode(node)) {
              const tag = node.getTag();
              const text = node.getTextContent().trim();
              if (text) {
                items.push({
                  key: node.getKey(),
                  level: tag === "h1" ? 1 : tag === "h2" ? 2 : 3,
                  text,
                });
              }
            }
          }
          return items;
        });
        onChange(nextOutline);
      }}
    />
  );
}

function getSelectedNode() {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();

  return anchorNode === focusNode
    ? anchorNode
    : selection.isBackward()
      ? focusNode
      : anchorNode;
}

function getSelectionLinkUrl() {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return "";
  }

  const selectedNode = getSelectedNode();
  const parent = selectedNode?.getParent();

  if (selectedNode && $isLinkNode(selectedNode)) {
    return selectedNode.getURL();
  }

  if (parent && $isLinkNode(parent)) {
    return parent.getURL();
  }

  return "";
}

function getSelectionRect(selection: Selection) {
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  if (!range) {
    return null;
  }

  const rects = Array.from(range.getClientRects());
  const rect = rects[0] ?? range.getBoundingClientRect();

  if (!rect || (!rect.width && !rect.height)) {
    return null;
  }

  return rect;
}

export function FloatingTextToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const selectionRef = useRef<ReturnType<typeof $getSelection>>(null);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [toolbarState, setToolbarState] = useState({
    isBold: false,
    isItalic: false,
    isLink: false,
    isUnderline: false,
    rect: null as DOMRect | null,
  });

  useEffect(() => {
    const updateToolbar = () => {
      const rootElement = editor.getRootElement();
      const nativeSelection = window.getSelection();

      if (
        !rootElement ||
        !nativeSelection ||
        nativeSelection.rangeCount === 0 ||
        !rootElement.contains(nativeSelection.anchorNode)
      ) {
        setToolbarState((current) => ({ ...current, rect: null }));
        setIsEditingLink(false);
        return;
      }

      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if (
          !$isRangeSelection(selection) ||
          selection.isCollapsed() ||
          selection.getTextContent().length < 1
        ) {
          selectionRef.current = null;
          setToolbarState((current) => ({ ...current, rect: null }));
          setIsEditingLink(false);
          return;
        }

        const rect = getSelectionRect(nativeSelection);
        const nextLinkUrl = getSelectionLinkUrl();

        if (!rect) {
          selectionRef.current = null;
          setToolbarState((current) => ({ ...current, rect: null }));
          setIsEditingLink(false);
          return;
        }

        setToolbarState({
          isBold: selection.hasFormat("bold"),
          isItalic: selection.hasFormat("italic"),
          isLink: Boolean(nextLinkUrl),
          isUnderline: selection.hasFormat("underline"),
          rect,
        });
        selectionRef.current = selection.clone();
        if (!isEditingLink) {
          setLinkUrl(nextLinkUrl);
        }
      });
    };

    return mergeRegister(
      editor.registerUpdateListener(() => {
        updateToolbar();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerRootListener(() => {
        updateToolbar();
      }),
    );
  }, [editor, isEditingLink]);

  useEffect(() => {
    const updateToolbar = () => {
      const rootElement = editor.getRootElement();
      const nativeSelection = window.getSelection();

      if (
        !rootElement ||
        !nativeSelection ||
        nativeSelection.rangeCount === 0 ||
        !rootElement.contains(nativeSelection.anchorNode)
      ) {
        setToolbarState((current) => ({ ...current, rect: null }));
        return;
      }

      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if (
          !$isRangeSelection(selection) ||
          selection.isCollapsed() ||
          selection.getTextContent().length < 1
        ) {
          setToolbarState((current) => ({ ...current, rect: null }));
          return;
        }

        const rect = getSelectionRect(nativeSelection);

        setToolbarState((current) => ({ ...current, rect }));
      });
    };

    window.addEventListener("resize", updateToolbar);
    document.addEventListener("scroll", updateToolbar, true);

    return () => {
      window.removeEventListener("resize", updateToolbar);
      document.removeEventListener("scroll", updateToolbar, true);
    };
  }, [editor]);

  if (typeof document === "undefined" || !toolbarState.rect) {
    return null;
  }

  const top = Math.max(toolbarState.rect.top - 56, 12);
  const left = toolbarState.rect.left + toolbarState.rect.width / 2;

  return createPortal(
    <div
      className="editor-floating-toolbar"
      style={{ left, top, transform: "translateX(-50%)" }}
    >
      {isEditingLink ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();

            if (!linkUrl.trim()) {
              editor.focus(() => {
                editor.update(() => {
                  $setSelection(selectionRef.current);
                });
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
              });
              setIsEditingLink(false);
              return;
            }

            if (!isValidUrl(linkUrl)) {
              return;
            }

            editor.focus(() => {
              editor.update(() => {
                $setSelection(selectionRef.current);
              });
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalizeUrl(linkUrl));
            });
            setIsEditingLink(false);
          }}
        >
          <input
            className="editor-floating-input"
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="Paste link"
            type="url"
            value={linkUrl}
          />
          <button
            className="editor-floating-button editor-floating-button-primary"
            onMouseDown={(event) => event.preventDefault()}
            type="submit"
          >
            Apply
          </button>
          {toolbarState.isLink ? (
            <button
              className="editor-floating-button"
              onClick={() => {
                editor.focus(() => {
                  editor.update(() => {
                    $setSelection(selectionRef.current);
                  });
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                });
                setIsEditingLink(false);
              }}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <button
            className={cn("editor-floating-icon", toolbarState.isBold && "editor-floating-icon-active")}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            className={cn("editor-floating-icon", toolbarState.isItalic && "editor-floating-icon-active")}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            className={cn("editor-floating-icon", toolbarState.isUnderline && "editor-floating-icon-active")}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Underline className="h-4 w-4" />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <button
            className={cn("editor-floating-icon", toolbarState.isLink && "editor-floating-icon-active")}
            onClick={() => {
              selectionRef.current = editor.getEditorState().read(() => {
                const selection = $getSelection();
                return $isRangeSelection(selection) ? selection.clone() : null;
              });
              setIsEditingLink(true);
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
