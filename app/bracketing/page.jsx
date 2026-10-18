"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import GameArt from "@/components/GameArt";
import MatchCard from "@/components/MatchCard";
import { getMatchState } from "@/lib/match-schedule";

export default function BracketingPage() {
  const [brackets, setBrackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [teamSearch, setTeamSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/brackets", { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load brackets.");
        setBrackets(result.brackets ?? []);
        setUpdatedAt(new Date());
        setError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
      }
    }
    load();
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRefreshKey((value) => value + 1);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const query = teamSearch.trim().toLocaleLowerCase();
  const filtered = brackets.map((bracket) => ({
    ...bracket,
    visibleRounds: bracket.rounds.map((round) => ({
      ...round,
      matches: round.matches.filter((match) => {
        const matchesTeam = !query || [match.teamA, match.teamB].some((team) => team?.team_name.toLocaleLowerCase().includes(query));
        const matchesStatus = statusFilter === "all" || getMatchState(match).key === statusFilter;
        return matchesTeam && matchesStatus;
      }),
    })).filter((round) => round.matches.length),
  })).filter((bracket) => (!query && statusFilter === "all") || bracket.visibleRounds.length);

  function refresh() { setRefreshing(true); setRefreshKey((value) => value + 1); }

  return (
    <main className="page-fade-in min-h-screen bg-slate-950 text-slate-100">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-black sm:text-5xl">Brackets & match schedules</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-300">Find your team’s opponent, match date, and latest result. All schedules use Philippine time (PHT, UTC+8).</p>
        <div className="mt-8 flex flex-col gap-4 border-y border-slate-700 py-5 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-semibold">Find your team
            <input type="search" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Enter a team name" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-base font-normal text-white placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-yellow-400" />
          </label>
          <label className="text-sm font-semibold">Match status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-yellow-400">
              <option value="all">All matches</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="complete">Completed</option><option value="pending">Schedule pending</option><option value="preview">Pairing previews</option><option value="bye">Byes</option>
            </select>
          </label>
          <button type="button" onClick={refresh} disabled={refreshing || loading} className="min-h-12 rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:border-yellow-400 focus-visible:outline-2 focus-visible:outline-yellow-400 disabled:opacity-50">{refreshing ? "Refreshing…" : "Refresh matches"}</button>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-400">Updates every 30 seconds while this page is open.{updatedAt && ` Last updated ${updatedAt.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit" })} PHT.`}</p>
        {error && <div role="alert" className="mt-6 rounded-lg border border-red-900 bg-red-950 p-4 text-red-300">{error} {updatedAt ? "Showing the last loaded matches. " : ""}<button type="button" onClick={refresh} className="underline underline-offset-4">Try again</button></div>}
        {loading ? <p role="status" className="mt-10 text-slate-300">Loading tournament brackets…</p> : !error && brackets.length === 0 ? <div className="mt-10"><h2 className="text-xl font-bold">No tournaments listed yet</h2><Link href="/register" className="mt-4 inline-block text-yellow-400">Go to registration</Link></div> : filtered.length === 0 && brackets.length > 0 ? <div className="mt-10"><p>No matches found for these filters.</p><button type="button" onClick={() => { setTeamSearch(""); setStatusFilter("all"); }} className="mt-3 min-h-11 font-semibold text-yellow-400 underline underline-offset-4">Clear filters</button></div> : <div className="mt-8 space-y-10">
          {filtered.map((bracket) => (
            <article key={bracket.id} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              <GameArt name={bracket.game_name} wide />
              <header className="border-b border-slate-700 px-5 py-5 sm:px-7">
                <h2 className="break-words text-2xl font-bold sm:text-3xl">{bracket.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{bracket.game_name || "Esports tournament"} · {bracket.entrants.length} registered {bracket.entrants.length === 1 ? "team" : "teams"}</p>
              </header>
              <div className="p-5 sm:p-7">
                {bracket.visibleRounds.length === 0 && <p className="text-slate-300">{bracket.entrants.length === 0 ? "No teams have registered yet. Match schedules will appear when published by the organizers." : "No matches have been published yet. Check back for your team’s schedule."}</p>}
                {bracket.visibleRounds.map((round) => (
                  <section key={round.round} className="mb-7 last:mb-0">
                    <h3 className="mb-4 text-lg font-bold">Round {round.round}</h3>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{round.matches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
                  </section>
                ))}
                {bracket.entrants.length > 0 && <details className="mt-6 border-t border-slate-700 pt-4"><summary className="cursor-pointer py-2 text-sm font-semibold text-yellow-400">View all {bracket.entrants.length} registered teams</summary><ol className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">{bracket.entrants.map((team, index) => <li key={team.id} className="break-words py-2"><span className="mr-3 text-slate-400">{index + 1}.</span>{team.team_name}</li>)}</ol></details>}
              </div>
            </article>
          ))}
        </div>}
      </section>
    </main>
  );
}
