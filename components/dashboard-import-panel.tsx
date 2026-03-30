"use client";

import { useActionState, useEffect, useRef } from "react";

import { importDocumentFromFile } from "@/app/actions/documents";

const initialState = {
  error: "",
};

export function DashboardImportPanel() {
  const [state, action, pending] = useActionState(importDocumentFromFile, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) {
      formRef.current?.reset();
    }
  }, [state.error]);

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_20px_80px_-50px_rgba(15,23,42,0.3)]">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-950">Import file</p>
        <p className="text-sm text-slate-500">
          Upload a `.txt` or `.md` file to create a new editable document.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-3 sm:flex-row" ref={formRef}>
        <input
          accept=".txt,.md,text/plain,text/markdown"
          className="block h-12 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          name="file"
          required
          type="file"
        />
        <button
          className="inline-flex h-12 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200"
          disabled={pending}
          type="submit"
        >
          {pending ? "Importing..." : "Import"}
        </button>
      </form>
      {state.error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
