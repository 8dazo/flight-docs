import { createDocument } from "@/app/actions/documents";
import { DashboardDocumentsTable } from "@/components/dashboard-documents-table";
import { DashboardImportPanel } from "@/components/dashboard-import-panel";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/documents";

export default async function DashboardPage() {
  const user = await requireUser();
  const { owned, shared } = await getDashboardData(user.id);
  const documents = [...owned, ...shared].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#fff7ed_100%)] px-5 py-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_120px_-54px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-orange-700">
                Flight Docs
              </p>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                  Your document workspace
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Create, import, share, and publish documents from one place.
                  Public links open in view mode, while shared collaborators keep editor access.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                {(user.name ?? user.email).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-950">
                  {user.name ?? "Flight Docs User"}
                </p>
                <p>{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form action={createDocument}>
              <button className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">
                New Document
              </button>
            </form>
            <DashboardImportPanel />
            <div className="xl:ml-auto">
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Owned</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{owned.length}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Shared</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{shared.length}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Public links</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {owned.filter((document) => document.isPublic).length}
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_120px_-54px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Documents
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Rich table view with owner, access, and visibility tags.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {documents.length} total
            </span>
          </div>
          <DashboardDocumentsTable documents={documents} />
        </section>

        <footer className="rounded-[2rem] border border-orange-200/70 bg-orange-50/80 p-5 text-sm leading-7 text-orange-950">
          Upload `.txt`, `.md`, or `.docx` files, share by email for editor access,
          or enable a public link so anyone with the URL can open the document in view mode.
        </footer>
      </div>
    </main>
  );
}
