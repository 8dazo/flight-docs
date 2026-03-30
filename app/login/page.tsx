import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff7ed_22%,#f8fafc_64%)] px-6 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(251,191,36,0.14),transparent_32%,rgba(15,23,42,0.04)_75%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="space-y-8">
          <span className="inline-flex rounded-full border border-amber-300 bg-amber-100/90 px-4 py-1 text-sm font-medium text-amber-900">
            Flight Docs v1
          </span>
          <div className="space-y-5">
            <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Collaborative docs that feel calm, fast, and dependable.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-700">
              Ship focused documents, share them cleanly, and keep every edit
              safely persisted in Postgres without overbuilding a full CRDT stack.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur">
              <p className="text-sm font-medium text-slate-500">Editor scope</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                Rich text + autosave
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur">
              <p className="text-sm font-medium text-slate-500">Sharing</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                Owner / editor access
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur">
              <p className="text-sm font-medium text-slate-500">Imports</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                `.txt` and `.md`
              </p>
            </div>
          </div>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
