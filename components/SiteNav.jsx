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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" onClick={() => setMobileMenuOpen(false)} className="min-w-0 font-black tracking-wide text-white">
          <span className="flex items-center gap-3">
            <Image src="/nu-wizards-logo.jpg" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 sm:h-12 sm:w-12" />
            <span className="leading-tight">
              <span className="block"><span className="text-yellow-500">NU</span> WIZARDS</span>
              <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">TOURNAMENT HUB</span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="site-navigation-links"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-100 transition hover:border-yellow-500 hover:text-yellow-400 lg:hidden"
        >
          <span aria-hidden="true" className="text-2xl leading-none">{mobileMenuOpen ? "×" : "☰"}</span>
        </button>
        <div id="site-navigation-links" className={`${mobileMenuOpen ? "flex" : "hidden"} w-full flex-col gap-1 border-t border-slate-800 pt-3 lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-1 lg:border-0 lg:pt-0`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 hover:text-yellow-400 lg:py-2"
            >
              {link.label}
            </Link>
          ))}
          {!checkingSession && (session ? (
            <>
              {isAdmin && <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 hover:text-yellow-400 lg:py-2">Admin</Link>}
              <button type="button" onClick={logOut} disabled={signingOut} className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-yellow-400 transition hover:bg-slate-900 hover:text-yellow-300 disabled:opacity-50 lg:py-2">
                {signingOut ? "Logging out…" : "Log out"}
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 hover:text-yellow-400 lg:py-2">Log in</Link>
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
