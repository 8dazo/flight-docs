import { signOut } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
        Sign out
      </button>
    </form>
  );
}
