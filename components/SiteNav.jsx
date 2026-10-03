"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const links = [
  { href: "/", label: "Home" },
  { href: "/register", label: "Register" },
  { href: "/bracketing", label: "Bracketing" },
];

export default function SiteNav() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  async function logOut() {
    setSigningOut(true);
    setError("");
    const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
    setSigningOut(false);
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="font-black tracking-wide text-white">
          <span className="flex items-center gap-3">
            <Image src="/nu-wizards-logo.jpg" alt="" width={48} height={48} className="h-12 w-12 rounded-full bg-white object-contain p-0.5" />
            <span>
              <span className="block"><span className="text-yellow-500">NU</span> WIZARDS</span>
              <span className="block text-[10px] font-semibold tracking-[0.18em] text-slate-400">TOURNAMENT HUB</span>
            </span>
          </span>
        </Link>
        <div className="flex gap-2 sm:gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-yellow-400"
            >
              {link.label}
            </Link>
          ))}
          {!checkingSession && (session ? (
            <button type="button" onClick={logOut} disabled={signingOut} className="rounded-md px-3 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-slate-900 hover:text-yellow-300 disabled:opacity-50">
              {signingOut ? "Logging out…" : "Log out"}
            </button>
          ) : (
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-yellow-400">Log in</Link>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="px-4 pb-2 text-center text-sm text-red-300">Could not log out: {error}</p>}
      <div aria-hidden="true" className="flex h-1 w-full">
        <span className="w-1/3 bg-yellow-500" />
        <span className="w-1/3 bg-red-900" />
        <span className="w-1/3 bg-emerald-950" />
      </div>
    </nav>
  );
}
