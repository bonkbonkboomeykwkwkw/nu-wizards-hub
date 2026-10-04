"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords don’t match.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setRecoveryReady(false);
      setMessage("Your password has been changed. You can now log in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      setError(updateError.message || "Could not update your password. Please request a fresh reset link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <><SiteNav /><main className="page-fade-in min-h-screen px-4 py-16 text-slate-100"><section className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-7">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-yellow-500">NU Wizards · Team captain</p><h1 className="text-3xl font-black">Choose a new password</h1>
    {message ? <><p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-300">{message}</p><Link className="inline-block font-semibold text-yellow-400" href="/login">Go to log in →</Link></> : recoveryReady ? <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-slate-400">Enter and confirm your new password. Use at least 8 characters.</p>
      <label className="block text-sm text-slate-300">New password<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="block text-sm text-slate-300">Confirm new password<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-yellow-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "Updating password…" : "Change password"}</button>
    </form> : <><p role="status" className="text-sm text-slate-400">Open the password reset link from your email on this page. If the link expired, request a new one.</p><Link className="inline-block font-semibold text-yellow-400" href="/forgot-password">Request another reset link →</Link></>}
  </section></main></>;
}
