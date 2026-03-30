"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import type { JSX } from "react";

import { DecoratorNode, $applyNodeReplacement } from "lexical";

export type ImagePayload = {
  altText?: string;
  caption?: string;
  key?: NodeKey;
  src: string;
};

export type SerializedImageNode = Spread<
  {
    altText: string;
    caption: string;
    src: string;
  },
  SerializedLexicalNode
>;

function ImageCard({
  altText,
  caption,
  src,
}: {
  altText: string;
  caption: string;
  src: string;
}) {
  return (
    <figure className="editor-image-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={altText} className="editor-image" loading="lazy" src={src} />
      {caption ? <figcaption className="editor-image-caption">{caption}</figcaption> : null}
    </figure>
  );
}

function convertImageElement(domNode: Node): DOMConversionOutput | null {
  const image = domNode as HTMLImageElement;
  const src = image.getAttribute("src");

  if (!src) {
    return null;
  }

  return {
    node: $createImageNode({
      altText: image.alt,
      src,
    }),
  };
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __caption: string;

  static getType(): string {
    return "flight-image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__caption, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      altText: serializedNode.altText,
      caption: serializedNode.caption,
      src: serializedNode.src,
    });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 1,
      }),
    };
  }

  constructor(src: string, altText: string, caption: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__caption = caption;
  }

  exportDOM(): DOMExportOutput {
    const image = document.createElement("img");
    image.setAttribute("src", this.__src);
    image.setAttribute("alt", this.__altText);
    return { element: image };
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.__altText,
      caption: this.__caption,
      src: this.__src,
      type: "flight-image",
      version: 1,
    };
  }

  setCaption(caption: string) {
    const writable = this.getWritable();
    writable.__caption = caption;
  }

  createDOM(config: EditorConfig): HTMLElement {
    void config;
    const element = document.createElement("div");
    element.className = "editor-image-block";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <ImageCard
        altText={this.__altText}
        caption={this.__caption}
        src={this.__src}
      />
    );
  }
}

export function $createImageNode({
  altText = "",
  caption = "",
  key,
  src,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, caption, key));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
