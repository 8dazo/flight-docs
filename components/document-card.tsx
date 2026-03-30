import Link from "next/link";

import type { DashboardDocument } from "@/lib/documents";
import { formatRelativeTime } from "@/lib/utils";

type Props = {
  document: DashboardDocument;
  variant: "owned" | "shared";
};

export function DocumentCard({ document, variant }: Props) {
  return (
    <Link
      className="group block rounded-[1.6rem] border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_70px_-42px_rgba(15,23,42,0.4)]"
      href={`/docs/${document.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950 group-hover:text-slate-700">
            {document.title}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Updated {formatRelativeTime(document.updatedAt)}
          </p>
        </div>
        <span
          className={
            variant === "owned"
              ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900"
              : "rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-900"
          }
        >
          {variant === "owned" ? "Owner" : "Shared"}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
          {document.owner.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-950">{document.owner.name}</p>
          <p>{document.owner.email}</p>
        </div>
      </div>
    </Link>
  );
}
