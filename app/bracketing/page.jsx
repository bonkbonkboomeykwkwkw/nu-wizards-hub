"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getGameBackgroundStyle } from "@/lib/game-art";

export default function BracketingPage() {
  const [brackets, setBrackets] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/brackets").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load brackets."); setBrackets(result.brackets ?? []); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  return <main className="page-fade-in min-h-screen bg-slate-950 text-slate-100"><SiteNav />
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-bold uppercase tracking-[.25em] text-yellow-500">NU Wizards Esports</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Tournament Brackets</h1><p className="mt-4 max-w-2xl text-slate-400">Find your team and see its first-round opponent. Brackets are seeded from registered teams.</p>
      {loading ? <p className="mt-10 text-slate-400">Loading tournament brackets…</p> : error ? <p role="alert" className="mt-10 text-red-300">{error}</p> : brackets.length === 0 ? <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-8"><h2 className="text-xl font-bold">No tournaments listed yet</h2><Link href="/register" className="mt-5 inline-block text-yellow-400">Go to registration →</Link></div> : <div className="mt-10 space-y-8">
        {brackets.map((bracket) => <article key={bracket.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <header className="relative min-h-48 bg-cover bg-center p-6 sm:p-9" style={{ ...getGameBackgroundStyle(bracket.game_name), backgroundSize: "cover", backgroundPosition: "center" }}>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-yellow-400">{bracket.game_name || "Esports tournament"} · {bracket.entrants.length} teams</p><h2 className="mt-3 text-2xl font-black sm:text-3xl">{bracket.title}</h2>
          </header>
          <div className="p-5 sm:p-7">{bracket.entrants.length === 0 ? <p className="text-slate-400">No teams have registered for this tournament yet.</p> : bracket.entrants.length === 1 ? <p className="text-slate-300">{bracket.entrants[0].team_name} is the only registered team so far.</p> : <>
            <h3 className="mb-4 font-bold">Round 1 matchups</h3><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{bracket.rounds[0]?.matches.map((match, index) => <div key={match.id} className="rounded-xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Match {index + 1}</p><div className="rounded-lg bg-slate-900 px-3 py-3 font-semibold">{match.teamA.team_name}</div><p className="py-2 text-center text-xs font-black text-yellow-500">VS</p>{match.teamB ? <div className="rounded-lg bg-slate-900 px-3 py-3 font-semibold">{match.teamB.team_name}</div> : <div className="rounded-lg border border-dashed border-yellow-700 px-3 py-3 text-sm text-yellow-300">BYE · advances automatically</div>}
            </div>)}</div>
            <details className="mt-6"><summary className="cursor-pointer text-sm font-semibold text-yellow-400">View all {bracket.entrants.length} registered teams</summary><ol className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">{bracket.entrants.map((team, index) => <li key={team.id} className="rounded-lg bg-slate-950 px-3 py-2"><span className="mr-3 text-slate-500">{String(index + 1).padStart(2, "0")}</span>{team.team_name}</li>)}</ol></details>
          </>}</div>
        </article>)}
      </div>}
    </section>
  </main>;
}
