"use client";

import { createLinkMatcherWithRegExp } from "@lexical/link";

import type { ZoomLevel } from "@/components/editor/types";

export const editorTheme = {
  code: "editor-code",
  heading: {
    h1: "editor-h1",
    h2: "editor-h2",
    h3: "editor-h3",
  },
  hr: "editor-hr",
  image: "editor-image-block",
  link: "editor-link",
  list: {
    checklist: "editor-checklist",
    listitem: "editor-list-item",
    listitemChecked: "editor-list-item-checked",
    listitemUnchecked: "editor-list-item-unchecked",
    nested: {
      listitem: "editor-nested-list-item",
    },
    ol: "editor-list-ol",
    ul: "editor-list-ul",
  },
  paragraph: "editor-paragraph",
  quote: "editor-quote",
  root: "editor-root",
  table: "editor-table",
  tableCell: "editor-table-cell",
  tableCellHeader: "editor-table-cell-header",
  tableRow: "editor-table-row",
  text: {
    bold: "font-semibold",
    code: "editor-inline-code",
    highlight: "editor-inline-highlight",
    italic: "italic",
    strikethrough: "line-through",
    subscript: "align-sub text-[0.75em]",
    superscript: "align-super text-[0.75em]",
    underline: "underline",
  },
};

export const FONT_FAMILY_OPTIONS = [
  "Arial",
  "Georgia",
  "Helvetica",
  "IBM Plex Sans",
  "Inter",
  "Roboto",
  "Times New Roman",
  "Verdana",
];

export const FONT_SIZE_OPTIONS = [
  "11px",
  "12px",
  "14px",
  "15px",
  "16px",
  "18px",
  "20px",
  "24px",
  "32px",
];

export const ZOOM_LEVELS: ZoomLevel[] = [0.9, 1, 1.1, 1.25, 1.5];
export const DEFAULT_TEXT_COLOR = "#0f172a";
export const DEFAULT_HIGHLIGHT_COLOR = "#ffffff";

export const URL_MATCHER = createLinkMatcherWithRegExp(
  /((https?:\/\/|www\.)[^\s]+)/,
  (text) => (text.startsWith("http") ? text : `https://${text}`),
);

export function isValidUrl(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

export function insertLink(url: string) {
  return normalizeUrl(url);
}
