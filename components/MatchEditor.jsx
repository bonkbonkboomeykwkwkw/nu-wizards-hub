"use client";

import { useState } from "react";
import { formatMatchSchedule, toMatchDateInput } from "@/lib/match-schedule";
import { resolveScheduleInput, validateScheduleDate } from "@/lib/schedule-validation";
import ScheduleDateInput from "@/components/ScheduleDateInput";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base text-slate-100 focus-visible:outline-2 focus-visible:outline-yellow-400";
const emptyMatch = { tournament_id: "", round_number: 1, match_number: 1, team_a_id: "", team_b_id: "", winner_id: "", team_a_score: 0, team_b_score: 0, status: "scheduled", scheduled_at: "" };

export default function MatchEditor({ tournaments, teams, matches, busy, onSave }) {
  const [match, setMatch] = useState(emptyMatch);
  const [error, setError] = useState("");
  const previousDate = matches.find((item) => item.id === match.id)?.scheduled_at;
  const teamsForMatch = teams.filter((team) => team.tournament_id === match.tournament_id);
  const participants = teamsForMatch.filter((team) => [match.team_a_id, match.team_b_id].includes(team.id));

  function update(field, value) { setMatch((current) => ({ ...current, [field]: value })); }
  function reset() { setMatch(emptyMatch); setError(""); }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const scheduledAt = resolveScheduleInput(new FormData(event.currentTarget).get("scheduled_at"), previousDate);
    if (!scheduledAt) { setError("Choose a valid match date and time in Philippine time."); return; }
    const dateError = validateScheduleDate(scheduledAt, { previous: previousDate, required: true, label: "Match date and time" });
    if (dateError) { setError(dateError); return; }
    if (match.team_a_id && match.team_a_id === match.team_b_id) { setError("Choose two different teams for this match."); return; }
    if (await onSave("saveMatch", { match: { ...match, scheduled_at: scheduledAt } })) reset();
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-7">
      <h2 className="text-xl font-bold text-yellow-400">Match schedules & results</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Assign teams to a round and match, set their date and time, then save. Both teams see the same schedule on the public brackets page. Change the status to Live when play starts and Completed when it ends.</p>
      <p className="mt-2 text-sm font-semibold text-yellow-300">All match times are entered in Philippine time (PHT, UTC+8).</p>
      <p id="match-date-help" className="mt-2 text-sm text-slate-300">New or changed schedules must be today at a time that has not passed, or in the future. Keep an existing past schedule unchanged when recording results.</p>
      {match.id && <p className="mt-4 text-sm text-slate-200">Editing round {match.round_number}, match {match.match_number}. Save changes or cancel to add a different match.</p>}
      <form onSubmit={submit} className="mt-5">
        <fieldset disabled={busy} className="grid gap-4 disabled:opacity-60 md:grid-cols-3">
          <legend className="sr-only">{match.id ? "Edit match" : "Add match"}</legend>
          <label className="text-sm">Tournament<select required className={fieldClass} value={match.tournament_id} onChange={(event) => setMatch({ ...match, tournament_id: event.target.value, team_a_id: "", team_b_id: "", winner_id: "" })}><option value="">Choose a tournament</option>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="text-sm">Round<input required className={fieldClass} type="number" min="1" value={match.round_number} onChange={(event) => update("round_number", event.target.value)} /></label>
          <label className="text-sm">Match number<input required className={fieldClass} type="number" min="1" value={match.match_number} onChange={(event) => update("match_number", event.target.value)} /></label>
          {[["team_a_id", "Team A"], ["team_b_id", "Team B"]].map(([key, label]) => <label key={key} className="text-sm">{label}<select className={fieldClass} value={match[key]} onChange={(event) => setMatch({ ...match, [key]: event.target.value, winner_id: "" })}><option value="">To be confirmed</option>{teamsForMatch.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}</select></label>)}
          <label className="text-sm">Match date & time (PHT)<ScheduleDateInput required name="scheduled_at" aria-describedby="match-date-help" previous={previousDate} className={fieldClass} value={match.scheduled_at} onChange={(event) => update("scheduled_at", event.target.value)} /></label>
          <label className="text-sm">Status<select className={fieldClass} value={match.status} onChange={(event) => update("status", event.target.value)}><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="complete">Completed</option></select></label>
          {[["team_a_score", "Team A score"], ["team_b_score", "Team B score"]].map(([key, label]) => <label key={key} className="text-sm">{label}<input required className={fieldClass} type="number" min="0" value={match[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
          <label className="text-sm">Winner<select className={fieldClass} value={match.winner_id} onChange={(event) => update("winner_id", event.target.value)}><option value="">No winner yet</option>{participants.map((team) => <option key={team.id} value={team.id}>{team.team_name}</option>)}</select></label>
          <div className="flex flex-wrap items-end gap-3 md:col-span-2">
            <button className="min-h-12 rounded-lg bg-yellow-500 px-5 py-3 font-bold text-slate-950 hover:bg-yellow-400">{busy ? "Saving…" : match.id ? "Save match changes" : "Add scheduled match"}</button>
            {match.id && <button type="button" onClick={reset} className="min-h-12 rounded-lg border border-slate-600 px-5 py-3 hover:border-yellow-400">Cancel editing</button>}
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      </form>
      <div className="mt-8 divide-y divide-slate-700 border-t border-slate-700">
        {matches.length === 0 && <p className="pt-5 text-sm text-slate-300">No saved matches yet. Add a match above to publish its schedule.</p>}
        {matches.map((item) => {
          const schedule = formatMatchSchedule(item.scheduled_at);
          const teamName = (id) => teams.find((team) => team.id === id)?.team_name || "To be confirmed";
          return <div key={item.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm leading-6"><p className="font-bold">{tournaments.find((tournament) => tournament.id === item.tournament_id)?.title || "Tournament"}</p><p className="break-words text-slate-200">{teamName(item.team_a_id)} vs {teamName(item.team_b_id)}</p><p className="text-slate-300">Round {item.round_number}, match {item.match_number} · {item.status === "complete" ? "Completed" : item.status === "live" ? "Live" : "Scheduled"}</p><p className="font-semibold text-yellow-300">{schedule ? `${schedule.date} · ${schedule.time} PHT` : "Schedule pending — edit to assign a date"}</p></div>
            <div className="flex shrink-0 gap-3"><button type="button" disabled={busy} onClick={() => { setMatch({ ...item, team_a_id: item.team_a_id ?? "", team_b_id: item.team_b_id ?? "", winner_id: item.winner_id ?? "", scheduled_at: toMatchDateInput(item.scheduled_at) }); setError(""); }} className="min-h-11 rounded-lg border border-slate-600 px-4 text-yellow-400 hover:border-yellow-400 disabled:opacity-50">Edit match</button><button type="button" disabled={busy} onClick={async () => { if (window.confirm(`Delete round ${item.round_number}, match ${item.match_number}? Its published schedule and result will be removed.`) && await onSave("deleteMatch", { id: item.id }) && match.id === item.id) reset(); }} className="min-h-11 px-3 text-red-300 hover:text-red-200 disabled:opacity-50">Delete</button></div>
          </div>;
        })}
      </div>
    </section>
  );
}
