import { formatMatchSchedule, getMatchState } from "@/lib/match-schedule";

const statusClasses = {
  preview: "bg-slate-800 text-white", pending: "bg-slate-800 text-white",
  scheduled: "bg-blue-950 text-blue-200", live: "bg-emerald-950 text-emerald-300",
  complete: "bg-slate-800 text-white", bye: "bg-yellow-950 text-yellow-300",
};

export default function MatchCard({ match }) {
  const state = getMatchState(match);
  const schedule = formatMatchSchedule(match.scheduled_at);
  const showScores = !match.is_preview && ["live", "complete"].includes(match.status);
  return (
    <article className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <h4 className="font-semibold text-slate-300">Match {match.match_number}</h4>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses[state.key]}`}>{state.label}</span>
      </div>
      <div className="my-4 border-y border-slate-800 py-3">
        {schedule ? <time dateTime={schedule.iso} className="block"><span className="block text-sm text-slate-300">{schedule.date}</span><span className="mt-1 block text-lg font-bold text-yellow-400">{schedule.time} PHT</span></time> : <p className="text-sm text-slate-300">{match.bye ? "No match to play" : "Date and time to be announced"}</p>}
      </div>
      <div className="space-y-3">
        {[[match.teamA, match.team_a_score], [match.teamB, match.team_b_score]].map(([team, score], index) => (
          <div key={index} className="flex items-start justify-between gap-4">
            <span className={`min-w-0 break-words font-semibold ${team && match.winner?.id === team.id ? "text-emerald-300" : "text-slate-100"}`}>{team?.team_name || (match.bye && index === 1 ? "Bye" : match.round_number > 1 ? `Winner of Round ${match.round_number - 1}, Match ${(match.match_number - 1) * 2 + index + 1}` : "Team to be confirmed")}</span>
            <span aria-label={showScores ? `Score ${score ?? 0}` : "Not played"} className="shrink-0 tabular-nums text-slate-300">{showScores ? score ?? 0 : "—"}</span>
          </div>
        ))}
      </div>
      {match.winner && <p className="mt-4 break-words text-sm text-emerald-300">{match.bye ? "Advances" : "Winner"}: {match.winner.team_name}</p>}
      {match.is_preview && <p className="mt-4 text-xs leading-5 text-slate-400">Provisional pairing. Await the organizer’s published matchup and schedule.</p>}
    </article>
  );
}
