"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn, formatRelativeTime } from "@/lib/utils";
import type { SaveState } from "@/components/editor/types";

export function SaveIndicator({
  saveState,
  updatedAt,
}: {
  saveState: SaveState;
  updatedAt: string;
}) {
  const label =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : saveState === "saved"
          ? "Saved to Drive"
          : "Idle";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
      <span className="font-medium text-slate-900">{label}</span>
      <span className="hidden text-slate-400 lg:inline">
        {updatedAt ? formatRelativeTime(updatedAt) : null}
      </span>
    </div>
  );
}

export function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return ref;
}

export function MenuDropdown({
  buttonClassName,
  items,
  label,
  menuAlign = "left",
}: {
  buttonClassName?: string;
  items: Array<{ disabled?: boolean; label: string; onSelect: () => void }>;
  label: string;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        className={cn(
          "rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950",
          buttonClassName,
        )}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {label}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute top-full z-30 mt-2 min-w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl",
            menuAlign === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={item.disabled}
              key={item.label}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function IconAction({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border text-slate-700 transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white hover:text-slate-950",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <div className="mx-1 h-7 w-px bg-slate-200" />;
}

export function SelectControl({
  onChange,
  options,
  value,
  widthClass = "w-auto",
}: {
  onChange: (value: string) => void;
  options: string[];
  value: string;
  widthClass?: string;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm",
        widthClass,
      )}
    >
      <select
        className="w-full appearance-none bg-transparent pr-6 outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

export function ColorControl({
  icon,
  onChange,
  value,
}: {
  icon: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="relative inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm">
      {icon}
      <input
        className="h-5 w-5 cursor-pointer rounded-full border border-slate-200 bg-transparent p-0"
        onChange={(event) => onChange(event.target.value)}
        type="color"
        value={value}
      />
    </label>
  );
}

export function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
          <button
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
