export function buildBracket(tournament) {
  const entrants = tournament.entrants ?? [];
  const configuredMatches = tournament.matches ?? [];
  const matches = configuredMatches.length ? configuredMatches.map((match) => ({
    ...match,
    // An empty future-round slot is not a bye. Only a recorded advancement is.
    bye: Boolean(match.teamA && !match.teamB && match.status === "complete" && match.winner?.id === match.teamA.id),
    is_preview: false,
  })) : entrants.reduce((items, team, index) => {
    if (index % 2 === 0) items.push({
      id: `preview-${index / 2}`, round_number: 1, match_number: index / 2 + 1,
      teamA: team, teamB: entrants[index + 1] ?? null, bye: false, is_preview: true,
      scheduled_at: null, status: "scheduled", team_a_score: 0, team_b_score: 0,
    });
    return items;
  }, []);
  const rounds = Object.values(matches.reduce((groups, match) => {
    const round = match.round_number ?? 1;
    groups[round] ??= { round, matches: [] };
    groups[round].matches.push(match);
    return groups;
  }, {})).sort((a, b) => a.round - b.round);
  for (const round of rounds) round.matches.sort((a, b) => a.match_number - b.match_number);
  return { ...tournament, entrants, rounds };
}
