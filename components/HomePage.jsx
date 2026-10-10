"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getGameBackgroundStyle } from "@/lib/game-art";

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcementError, setAnnouncementError] = useState("");
  const [tournamentError, setTournamentError] = useState("");
  const [signupNotice, setSignupNotice] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState("");
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const signupNoticeTimer = window.setTimeout(() => {
      setSignupNotice(new URLSearchParams(window.location.search).get("signup") === "check-email");
      const parameters = new URLSearchParams(window.location.search);
      if (parameters.get("registration") === "success") {
        setRegistrationNotice(parameters.get("team") || "Your team");
      }
    }, 0);
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    async function loadPageData() {
      const [announcementResult, tournamentResult] = await Promise.allSettled([
        fetch("/api/announcements").then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to load announcements.");
          return result.announcements ?? [];
        }),
        fetch("/api/tournaments").then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to load tournaments.");
          return result.tournaments ?? [];
        }),
      ]);

      if (announcementResult.status === "fulfilled") {
        setAnnouncements(announcementResult.value);
      } else {
        setAnnouncementError(announcementResult.reason.message);
      }
      if (tournamentResult.status === "fulfilled") {
        setTournaments(tournamentResult.value);
      } else {
        setTournamentError(tournamentResult.reason.message);
      }
      setLoading(false);
    }

    loadPageData();
    return () => {
      window.clearTimeout(signupNoticeTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="page-fade-in min-h-screen bg-slate-950 text-slate-100">
      <SiteNav />
      {signupNotice && <div role="status" className="border-b border-yellow-700 bg-yellow-950/70 px-4 py-4 text-center text-sm text-yellow-100">
        Account created. Check your inbox and confirm your email before logging in to register your team.
      </div>}
      {registrationNotice && <div role="status" className="border-b border-emerald-700 bg-emerald-950/70 px-4 py-4 text-center text-sm text-emerald-100">
        Registration complete for <strong>{registrationNotice}</strong>. Your confirmation has been sent to the captain email.
      </div>}
      <div className="border-b border-slate-800 bg-slate-900 px-3 py-2 text-center text-sm sm:px-4 sm:py-3">
        {checkingSession ? <span className="text-slate-400">Checking login…</span> : session?.user?.email ? (
          <p className="text-emerald-300">Welcome user ({session.user.email})</p>
        ) : (
          <p className="text-slate-300"><span className="hidden sm:inline">Not logged in. </span><Link href="/login" className="font-semibold text-yellow-400 hover:text-yellow-300">Log in</Link> or <Link href="/signup" className="font-semibold text-yellow-400 hover:text-yellow-300">sign up</Link> to register a team.</p>
        )}
      </div>
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-500">
            National University · School Esports
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
            The Wizards Tournament Hub
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Tournament announcements, team registration, and live brackets for NU Wizards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-yellow-500 px-5 py-3 font-bold text-slate-950 hover:bg-yellow-400">
              Register your team
            </Link>
            <Link href="/bracketing" className="rounded-lg border border-slate-700 px-5 py-3 font-bold text-slate-100 hover:border-yellow-500">
              View brackets
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Stay in the game</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Latest announcements</h2>
          </div>
          <Link href="/bracketing" className="text-sm font-semibold text-yellow-400 hover:text-yellow-300">
            Check the brackets →
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading announcements…</p>
        ) : announcementError ? (
          <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-300">
            Could not load announcements: {announcementError}
          </p>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-slate-300">
            No announcements are posted yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {announcements.map((announcement) => (
              <article key={announcement.id} style={{ ...getGameBackgroundStyle(`${announcement.title} ${announcement.content}`), backgroundSize: "cover", backgroundPosition: "center" }} className="card-fade-in rounded-2xl border border-slate-700 p-6 shadow-lg">
                <p className="text-sm font-semibold text-yellow-500">
                  {announcement.created_at
                    ? new Date(announcement.created_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Manila",
                      })
                    : "NU Wizards Update"}
                </p>
                <h3 className="mt-2 text-xl font-bold">{announcement.title}</h3>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-white">{announcement.content}</p>
                <Link href="/register" className="mt-5 inline-block text-sm font-semibold text-yellow-400 hover:text-yellow-300">
                  Register for a tournament →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Compete with the Wizards</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Tournaments</h2>
        </div>
        {tournamentError ? (
          <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-300">
            Could not load tournaments: {tournamentError}
          </p>
        ) : tournaments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tournaments.map((tournament) => {
              const status = String(tournament.registration_status ?? "Scheduled");
              const isOpen = ["open", "active", "true"].includes(status.toLowerCase());
              return (
                <article key={tournament.id} style={{ ...getGameBackgroundStyle(tournament.game_name), backgroundSize: "cover", backgroundPosition: "center" }} className="card-fade-in rounded-2xl border border-slate-700 p-6 shadow-lg">
                  <p className="text-sm font-semibold text-yellow-500">{tournament.game_name || "NU Wizards Tournament"}</p>
                  <h3 className="mt-2 text-xl font-bold">{tournament.title}</h3>
                  <p className="mt-2 text-sm text-slate-200">
                    {tournament.team_format || "Team event"}
                    {tournament.max_team_size ? ` · Up to ${tournament.max_team_size} players` : ""}
                  </p>
                  {(tournament.location || tournament.starts_at) && <p className="mt-2 text-sm text-slate-300">
                    {tournament.location || "Venue TBA"}{tournament.starts_at ? ` · ${new Date(tournament.starts_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}` : ""}
                  </p>}
                  {tournament.details && <p className="mt-3 text-sm leading-6 text-slate-300">{tournament.details}</p>}
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-300">
                    {isOpen ? "Registration open" : status}
                  </p>
                  <div className="mt-5 flex gap-4 text-sm font-semibold">
                    {isOpen && <Link href="/register" className="text-yellow-400 hover:text-yellow-300">Register →</Link>}
                    <Link href="/bracketing" className="text-slate-300 hover:text-white">Bracketing →</Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : !loading ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-slate-400">No tournaments are listed yet.</p>
        ) : null}
      </section>
      <footer className="border-t border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
        National University · Wizards Esports
      </footer>
    </main>
  );
}
