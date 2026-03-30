"use client";

import type {
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import type { JSX } from "react";

import { DecoratorNode, $applyNodeReplacement } from "lexical";

type EmbedKind = "figma" | "link" | "youtube";

export type EmbedPayload = {
  key?: NodeKey;
  title?: string;
  url: string;
};

export type SerializedEmbedNode = Spread<
  {
    title: string;
    url: string;
  },
  SerializedLexicalNode
>;

function getYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
  } catch {}

  return null;
}

function getEmbedKind(url: string): EmbedKind {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return "youtube";
    }

    if (host.includes("figma.com")) {
      return "figma";
    }
  } catch {}

  return "link";
}

function EmbedCard({ title, url }: { title: string; url: string }) {
  const kind = getEmbedKind(url);
  const youTubeId = kind === "youtube" ? getYouTubeId(url) : null;

  if (kind === "youtube" && youTubeId) {
    return (
      <div className="editor-embed-card">
        <div className="editor-embed-header">
          <span className="editor-embed-chip">YouTube</span>
          <a className="editor-embed-link" href={url} rel="noreferrer" target="_blank">
            Open source
          </a>
        </div>
        <div className="editor-embed-frame">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            src={`https://www.youtube.com/embed/${youTubeId}`}
            title={title || "YouTube embed"}
          />
        </div>
      </div>
    );
  }

  if (kind === "figma") {
    return (
      <div className="editor-embed-card">
        <div className="editor-embed-header">
          <span className="editor-embed-chip">Figma</span>
          <a className="editor-embed-link" href={url} rel="noreferrer" target="_blank">
            Open file
          </a>
        </div>
        <div className="editor-embed-frame">
          <iframe
            src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`}
            title={title || "Figma embed"}
          />
        </div>
      </div>
    );
  }

  return (
    <a className="editor-bookmark-card" href={url} rel="noreferrer" target="_blank">
      <span className="editor-embed-chip">Bookmark</span>
      <strong>{title || url}</strong>
      <span className="editor-bookmark-url">{url}</span>
    </a>
  );
}

export class EmbedNode extends DecoratorNode<JSX.Element> {
  __title: string;
  __url: string;

  static getType(): string {
    return "flight-embed";
  }

  static clone(node: EmbedNode): EmbedNode {
    return new EmbedNode(node.__url, node.__title, node.__key);
  }

  static importJSON(serializedNode: SerializedEmbedNode): EmbedNode {
    return $createEmbedNode({
      title: serializedNode.title,
      url: serializedNode.url,
    });
  }

  constructor(url: string, title: string, key?: NodeKey) {
    super(key);
    this.__url = url;
    this.__title = title;
  }

  exportDOM(): DOMExportOutput {
    const link = document.createElement("a");
    link.href = this.__url;
    link.textContent = this.__title || this.__url;
    return { element: link };
  }

  exportJSON(): SerializedEmbedNode {
    return {
      title: this.__title,
      type: "flight-embed",
      url: this.__url,
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    void config;
    const element = document.createElement("div");
    element.className = "editor-embed-block";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <EmbedCard title={this.__title} url={this.__url} />;
  }
}

export function $createEmbedNode({
  key,
  title = "",
  url,
}: EmbedPayload): EmbedNode {
  return $applyNodeReplacement(new EmbedNode(url, title, key));
}

export function $isEmbedNode(node: LexicalNode | null | undefined): node is EmbedNode {
  return node instanceof EmbedNode;
}
