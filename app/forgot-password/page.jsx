"use client";

import Link from "next/link";
import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setMessage("If an account exists for that email, Supabase will send a password reset link. Check your inbox and spam folder.");
    } catch (resetError) {
      setError(resetError.message || "Could not request a password reset. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <><SiteNav /><main className="page-fade-in min-h-screen px-4 py-16 text-slate-100"><form onSubmit={submit} className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-7">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-yellow-500">NU Wizards · Team captain</p><h1 className="text-3xl font-black">Reset your password</h1><p className="text-sm text-slate-400">Enter your account email and we’ll send a link to choose a new password.</p>
    <label className="block text-sm text-slate-300">Email<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-300">{message}</p>}
    <button disabled={busy} className="w-full rounded-lg bg-yellow-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "Sending link…" : "Send reset link"}</button>
    <p className="text-sm text-slate-400"><Link className="text-yellow-400" href="/login">Back to log in</Link></p>
  </form></main></>;
}
