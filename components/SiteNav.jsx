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
  { href: "/check-registration", label: "Check Registration" },
];

export default function SiteNav() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function updateSession(nextSession) {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        const { data } = await supabase.from("profiles").select("role, is_active").eq("id", nextSession.user.id).maybeSingle();
        setIsAdmin(data?.role === "admin" && data?.is_active === true);
      } else {
        setIsAdmin(false);
      }
      setCheckingSession(false);
    }
    supabase.auth.getSession().then(({ data }) => updateSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => { updateSession(nextSession); });
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/" className="font-black tracking-wide text-white">
          <span className="flex items-center gap-3">
            <Image src="/nu-wizards-logo.jpg" alt="" width={48} height={48} className="h-10 w-10 rounded-full bg-white object-contain p-0.5 sm:h-12 sm:w-12" />
            <span>
              <span className="block"><span className="text-yellow-500">NU</span> WIZARDS</span>
              <span className="block text-[10px] font-semibold tracking-[0.18em] text-slate-400">TOURNAMENT HUB</span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:border-yellow-500 hover:text-yellow-400 sm:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="site-navigation-links"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="text-2xl leading-none" aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
        <div id="site-navigation-links" className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-1 border-t border-slate-800 pt-2 sm:flex sm:w-auto sm:flex-row sm:gap-2 sm:border-0 sm:pt-0 lg:gap-6`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-yellow-400"
            >
              {link.label}
            </Link>
          ))}
          {!checkingSession && (session ? (
            <>
              {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-yellow-400">Admin</Link>}
              <button type="button" onClick={logOut} disabled={signingOut} className="rounded-md px-3 py-2 text-left text-sm font-semibold text-yellow-400 transition hover:bg-slate-900 hover:text-yellow-300 disabled:opacity-50 sm:text-center">
                {signingOut ? "Logging out…" : "Log out"}
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-yellow-400">Log in</Link>
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
