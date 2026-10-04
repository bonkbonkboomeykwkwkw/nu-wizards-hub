"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    else router.replace("/");
    setBusy(false);
  }

  return <><SiteNav /><main className="page-fade-in min-h-screen px-4 py-16 text-slate-100"><form onSubmit={submit} className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-7">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-yellow-500">NU Wizards · Team captain</p><h1 className="text-3xl font-black">Log in</h1><p className="text-sm text-slate-400">Use your verified email account to register a team.</p>
    <label className="block text-sm text-slate-300">Email<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
    <label className="block text-sm text-slate-300">Password<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
    <p className="-mt-2 text-right text-sm"><Link className="text-yellow-400 hover:text-yellow-300" href="/forgot-password">Forgot password?</Link></p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <button disabled={busy} className="w-full rounded-lg bg-yellow-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "Signing in…" : "Log in with email"}</button><p className="text-sm text-slate-400">New captain? <Link className="text-yellow-400" href="/signup">Create an account</Link></p>
  </form></main></>;
}
