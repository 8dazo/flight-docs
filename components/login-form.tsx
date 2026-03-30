"use client";

import { useActionState } from "react";

import { signIn } from "@/app/actions/auth";

const DEMO_USERS = [
  { email: "ava@flightdocs.dev", label: "Ava Chen" },
  { email: "sam@flightdocs.dev", label: "Sam Rivera" },
];

export function LoginForm() {
  const [state, action, isPending] = useActionState(signIn, {
    error: "",
    success: false,
  });

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-[0_36px_120px_-56px_rgba(15,23,42,0.65)] backdrop-blur sm:p-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
          Sign in
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Open your workspace
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Use the seeded demo accounts from Postgres and the shared password
          configured in{" "}
          <code className="rounded bg-slate-100 px-1.5 py-1 text-xs text-slate-700">
            DEMO_USER_PASSWORD
          </code>
          .
        </p>
      </div>

      <form action={action} className="mt-8 space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Demo user</span>
          <select
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            defaultValue={DEMO_USERS[0].email}
            name="email"
          >
            {DEMO_USERS.map((user) => (
              <option key={user.email} value={user.email}>
                {user.label} ({user.email})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            name="password"
            placeholder="Enter the demo password"
            required
            type="password"
          />
        </label>

        {state.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}

        <button
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Signing in..." : "Sign in to Flight Docs"}
        </button>
      </form>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-950">Demo sequence</p>
        <p className="mt-1">
          Sign in as Ava, create and share a document with Sam, then sign out
          and reopen the app as Sam to test the shared-doc flow.
        </p>
      </div>
    </section>
  );
}
