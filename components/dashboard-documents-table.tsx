import Link from "next/link";

import type { DashboardDocument } from "@/lib/documents";
import { formatRelativeTime } from "@/lib/utils";

function Tag({
  children,
  tone,
}: {
  children: string;
  tone: "amber" | "emerald" | "sky" | "slate" | "violet";
}) {
  const className =
    tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-900"
        : tone === "sky"
          ? "bg-sky-100 text-sky-900"
          : tone === "violet"
            ? "bg-violet-100 text-violet-900"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}

export function DashboardDocumentsTable({
  documents,
}: {
  documents: DashboardDocument[];
}) {
  if (!documents.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
        No documents yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_-50px_rgba(15,23,42,0.28)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="px-5 py-4 font-semibold">Document</th>
              <th className="px-5 py-4 font-semibold">Owner</th>
              <th className="px-5 py-4 font-semibold">Type</th>
              <th className="px-5 py-4 font-semibold">Permission</th>
              <th className="px-5 py-4 font-semibold">Visibility</th>
              <th className="px-5 py-4 font-semibold">Updated</th>
              <th className="px-5 py-4 font-semibold text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr
                className="border-t border-slate-200 text-sm text-slate-600 transition hover:bg-slate-50/80"
                key={document.id}
              >
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-950">{document.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{document.owner.email}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                      {document.owner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-900">{document.owner.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Tag tone={document.kind === "owned" ? "amber" : "sky"}>
                    {document.kind === "owned" ? "Owner" : "Shared"}
                  </Tag>
                </td>
                <td className="px-5 py-4">
                  <Tag
                    tone={
                      document.access === "owner"
                        ? "violet"
                        : document.access === "edit"
                          ? "sky"
                          : "slate"
                    }
                  >
                    {document.access === "owner"
                      ? "Full access"
                      : document.access === "edit"
                        ? "Edit access"
                        : "View access"}
                  </Tag>
                </td>
                <td className="px-5 py-4">
                  <Tag tone={document.isPublic ? "emerald" : "slate"}>
                    {document.isPublic ? "Public" : "Private"}
                  </Tag>
                </td>
                <td className="px-5 py-4">{formatRelativeTime(document.updatedAt)}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    href={`/docs/${document.id}`}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
