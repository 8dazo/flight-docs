import type { Prisma } from "@prisma/client";

type LexicalTextNode = {
  detail: number;
  format: number;
  mode: "normal";
  style: string;
  text: string;
  type: "text";
  version: 1;
};

type LexicalParagraphNode = {
  children: LexicalTextNode[];
  direction: "ltr" | null;
  format: string;
  indent: number;
  textFormat: number;
  textStyle: string;
  type: "paragraph";
  version: 1;
};

type LexicalHeadingNode = {
  children: LexicalTextNode[];
  direction: "ltr" | null;
  format: string;
  indent: number;
  tag: "h1" | "h2";
  type: "heading";
  version: 1;
};

type LexicalListItemNode = {
  children: LexicalParagraphNode[];
  direction: "ltr" | null;
  format: string;
  indent: number;
  type: "listitem";
  value: number;
  version: 1;
};

type LexicalListNode = {
  children: LexicalListItemNode[];
  direction: "ltr" | null;
  format: string;
  indent: number;
  listType: "bullet" | "number";
  start: number;
  tag: "ol" | "ul";
  type: "list";
  version: 1;
};

type LexicalRootNode = {
  children: Array<LexicalParagraphNode | LexicalHeadingNode | LexicalListNode>;
  direction: "ltr" | null;
  format: string;
  indent: number;
  type: "root";
  version: 1;
};

export type SerializedDocumentState = {
  root: LexicalRootNode;
};

function createTextNode(text: string): LexicalTextNode {
  return {
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    type: "text",
    version: 1,
  };
}

function createParagraphNode(text = ""): LexicalParagraphNode {
  return {
    children: [createTextNode(text)],
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    textStyle: "",
    type: "paragraph",
    version: 1,
  };
}

function createHeadingNode(text: string, tag: "h1" | "h2"): LexicalHeadingNode {
  return {
    children: [createTextNode(text)],
    direction: "ltr",
    format: "",
    indent: 0,
    tag,
    type: "heading",
    version: 1,
  };
}

function createListNode(
  items: string[],
  listType: "bullet" | "number",
): LexicalListNode {
  return {
    children: items.map((item, index) => ({
      children: [createParagraphNode(item)],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "listitem",
      value: index + 1,
      version: 1,
    })),
    direction: "ltr",
    format: "",
    indent: 0,
    listType,
    start: 1,
    tag: listType === "bullet" ? "ul" : "ol",
    type: "list",
    version: 1,
  };
}

export function createEmptyDocumentState(): SerializedDocumentState {
  return {
    root: {
      children: [createParagraphNode()],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

export function createDocumentStateFromText(rawText: string) {
  const text = rawText.replace(/\r\n/g, "\n").trim();

  if (!text) {
    return createEmptyDocumentState();
  }

  const lines = text.split("\n");
  const children: SerializedDocumentState["root"]["children"] = [];

  let bulletBuffer: string[] = [];
  let numberBuffer: string[] = [];

  const flushLists = () => {
    if (bulletBuffer.length) {
      children.push(createListNode(bulletBuffer, "bullet"));
      bulletBuffer = [];
    }

    if (numberBuffer.length) {
      children.push(createListNode(numberBuffer, "number"));
      numberBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushLists();
      children.push(createParagraphNode());
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushLists();
      children.push(createHeadingNode(trimmed.slice(2).trim(), "h1"));
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushLists();
      children.push(createHeadingNode(trimmed.slice(3).trim(), "h2"));
      continue;
    }

    const bulletMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bulletMatch) {
      numberBuffer.length = 0;
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (numberedMatch) {
      bulletBuffer.length = 0;
      numberBuffer.push(numberedMatch[1]);
      continue;
    }

    flushLists();
    children.push(createParagraphNode(trimmed));
  }

  flushLists();

  return {
    root: {
      children: children.length ? children : [createParagraphNode()],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

export function isSerializedDocumentState(
  value: unknown,
): value is Prisma.JsonValue {
  return typeof value === "object" && value !== null && "root" in value;
}

export function getTitleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").trim() || "Imported Document";
}
