export type SaveState = "idle" | "saving" | "saved" | "error";

export type ZoomLevel = 0.9 | 1 | 1.1 | 1.25 | 1.5;

export type EditorDialogState =
  | { type: "embed" }
  | { type: "image" }
  | { type: "link"; initialUrl: string }
  | { type: "shortcuts" }
  | { type: "table" }
  | { type: "wordCount"; characters: number; words: number };

export type ToolbarState = {
  blockType:
    | "bullet"
    | "check"
    | "code"
    | "h1"
    | "h2"
    | "h3"
    | "number"
    | "paragraph"
    | "quote";
  canRedo: boolean;
  canUndo: boolean;
  fontFamily: string;
  fontSize: string;
  highlightColor: string;
  isBold: boolean;
  isCode: boolean;
  isItalic: boolean;
  isLink: boolean;
  isStrikethrough: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isTable: boolean;
  isUnderline: boolean;
  textColor: string;
};

export type OutlineItem = {
  key: string;
  level: 1 | 2 | 3;
  text: string;
};
