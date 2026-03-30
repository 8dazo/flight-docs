"use client";

import { $generateHtmlFromNodes } from "@lexical/html";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { $getRoot, type LexicalEditor } from "lexical";

import { slugifyFilename } from "@/lib/utils";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getBaseFilename(title: string) {
  const fallback = "untitled-document";
  const slug = slugifyFilename(title || fallback);
  return slug || fallback;
}

function getEditorContent(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const markdown = $convertToMarkdownString(TRANSFORMERS);
    const text = $getRoot().getTextContent();
    const html = $generateHtmlFromNodes(editor, null);

    return {
      html,
      markdown: markdown.trimEnd(),
      text: text.trimEnd(),
    };
  });
}

function markdownToDocxParagraphs(markdown: string) {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed.slice(4))],
          heading: HeadingLevel.HEADING_3,
        }),
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed.slice(3))],
          heading: HeadingLevel.HEADING_2,
        }),
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed.slice(2))],
          heading: HeadingLevel.HEADING_1,
        }),
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed.replace(/^[-*]\s+/, ""))],
          bullet: { level: 0 },
        }),
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmed)],
        }),
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun(trimmed)],
      }),
    );
  }

  return paragraphs;
}

function createPdfContainer(title: string, html: string) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.zIndex = "-1";
  container.style.width = "816px";
  container.style.boxSizing = "border-box";
  container.style.background = "#ffffff";
  container.style.color = "#0f172a";
  container.style.opacity = "0.01";
  container.style.pointerEvents = "none";
  container.style.padding = "56px 64px";
  container.style.fontFamily = '"Space Grotesk", Arial, sans-serif';
  container.style.fontSize = "15px";
  container.style.lineHeight = "1.8";

  container.innerHTML = `
    <style>
      .pdf-shell h1, .pdf-shell h2, .pdf-shell h3 {
        color: #0f172a;
        font-weight: 700;
        line-height: 1.15;
        margin: 0 0 16px;
      }
      .pdf-shell h1 { font-size: 34px; letter-spacing: -0.04em; }
      .pdf-shell h2 { font-size: 26px; letter-spacing: -0.03em; margin-top: 28px; }
      .pdf-shell h3 { font-size: 22px; letter-spacing: -0.02em; margin-top: 24px; }
      .pdf-shell p { margin: 0 0 14px; }
      .pdf-shell ul, .pdf-shell ol { margin: 0 0 16px; padding-left: 24px; }
      .pdf-shell li { margin: 6px 0; }
      .pdf-shell blockquote {
        margin: 20px 0;
        border-left: 4px solid #cbd5e1;
        padding-left: 16px;
        color: #475569;
      }
      .pdf-shell code {
        background: #eef2ff;
        border-radius: 6px;
        padding: 2px 6px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.92em;
      }
      .pdf-shell pre {
        white-space: pre-wrap;
        background: #0f172a;
        color: #e2e8f0;
        border-radius: 16px;
        padding: 18px;
        overflow: hidden;
      }
      .pdf-shell a { color: #4338ca; text-decoration: underline; }
      .pdf-shell hr { border: 0; border-top: 1px solid rgba(148, 163, 184, 0.35); margin: 24px 0; }
      .pdf-shell table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .pdf-shell th, .pdf-shell td {
        border: 1px solid rgba(148, 163, 184, 0.24);
        padding: 10px 12px;
        vertical-align: top;
      }
      .pdf-shell th {
        background: #f8fafc;
        font-weight: 600;
      }
      .pdf-shell img {
        max-width: 100%;
        border-radius: 18px;
        display: block;
      }
      .pdf-shell figure { margin: 24px 0; }
      .pdf-shell figcaption { color: #64748b; font-size: 13px; margin-top: 10px; }
    </style>
    <article class="pdf-shell">
      <h1>${title || "Untitled document"}</h1>
      ${html}
    </article>
  `;

  document.body.appendChild(container);

  return container;
}

export function downloadTextFile(editor: LexicalEditor, title: string) {
  const { text } = getEditorContent(editor);
  downloadBlob(`${getBaseFilename(title)}.txt`, new Blob([text], { type: "text/plain;charset=utf-8" }));
}

export function downloadMarkdownFile(editor: LexicalEditor, title: string) {
  const { markdown } = getEditorContent(editor);
  downloadBlob(
    `${getBaseFilename(title)}.md`,
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
  );
}

export async function downloadDocxFile(editor: LexicalEditor, title: string) {
  const { markdown, text } = getEditorContent(editor);
  const document = new Document({
    sections: [
      {
        children: markdownToDocxParagraphs(markdown || text || title),
      },
    ],
  });

  const buffer = await Packer.toBlob(document);
  downloadBlob(`${getBaseFilename(title)}.docx`, buffer);
}

export async function downloadPdfFile(editor: LexicalEditor, title: string) {
  const { html } = getEditorContent(editor);
  const pdf = new jsPDF({
    format: "a4",
    unit: "pt",
  });
  const container = createPdfContainer(title, html);

  await pdf.html(container, {
    autoPaging: "text",
    html2canvas: {
      backgroundColor: "#ffffff",
      scale: 0.78,
      useCORS: true,
    },
    margin: [24, 24, 24, 24],
    width: 547,
    windowWidth: 816,
  });

  container.remove();
  pdf.save(`${getBaseFilename(title)}.pdf`);
}

export function copyDocumentHtml(editor: LexicalEditor) {
  const { html } = getEditorContent(editor);
  return navigator.clipboard.writeText(html);
}
