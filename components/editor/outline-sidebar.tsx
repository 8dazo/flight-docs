"use client";

import { FileText, PanelLeftOpen } from "lucide-react";

import type { OutlineItem } from "@/components/editor/types";
import { cn } from "@/lib/utils";

export function OutlineSidebar({
  items,
  onJumpToHeading,
  title,
}: {
  items: OutlineItem[];
  onJumpToHeading: (key: string) => void;
  title: string;
}) {
  return (
    <aside className="editor-sidebar flex h-full min-h-0 flex-col">
      <div className="shrink-0 flex items-center gap-3 border-b border-slate-200 px-4 py-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
          <PanelLeftOpen className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Outline
          </p>
          <p className="text-sm font-semibold text-slate-900">{title || "Untitled document"}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.length ? (
          items.map((item) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950",
                item.level === 1 && "font-semibold text-slate-900",
                item.level === 2 && "pl-6",
                item.level === 3 && "pl-9 text-slate-500",
              )}
              key={item.key}
              onClick={() => onJumpToHeading(item.key)}
              type="button"
            >
              <span className="h-px w-4 bg-slate-300" />
              <span className="truncate">{item.text}</span>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <FileText className="h-4 w-4" />
            </div>
            Add headings to generate a document outline here.
          </div>
        )}
      </div>
    </aside>
  );
}
