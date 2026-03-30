import { createDocument } from "@/app/actions/documents";
import { DashboardImportPanel } from "@/components/dashboard-import-panel";
import { DocumentCard } from "@/components/document-card";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/documents";

export default async function DashboardPage() {
  const user = await requireUser();
  const { owned, shared } = await getDashboardData(user.id);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#fefce8_100%)] px-5 py-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_120px_-54px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
                Flight Docs
              </p>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                  Good documentation should stay in motion.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Create documents, reopen them with full formatting intact, and
                  share editor access without leaving this workspace.
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={createDocument}>
              <button className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">
                New Document
              </button>
            </form>
            <DashboardImportPanel />
            <div className="sm:ml-auto">
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_120px_-54px_rgba(15,23,42,0.25)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Owned by me
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Documents you control and can share.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                {owned.length}
              </span>
            </div>
            <div className="space-y-3">
              {owned.length ? (
                owned.map((document) => (
                  <DocumentCard key={document.id} document={document} variant="owned" />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  No documents yet. Create one and you&apos;ll land directly in the
                  editor with autosave ready to go.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_120px_-54px_rgba(15,23,42,0.25)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Shared with me
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Documents where you have editor access.
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900">
                {shared.length}
              </span>
            </div>
            <div className="space-y-3">
              {shared.length ? (
                shared.map((document) => (
                  <DocumentCard key={document.id} document={document} variant="shared" />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  Nothing shared with you yet. Use the seeded users to demo
                  ownership and shared access between accounts.
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="rounded-[2rem] border border-amber-200/70 bg-amber-50/80 p-5 text-sm leading-7 text-amber-950">
          Demo flow: sign in as one user, create a document, share it by exact
          email, then sign in as the second user to see it appear under{" "}
          <span className="font-semibold">Shared with me</span>.
        </footer>
      </div>
    </main>
  );
}
