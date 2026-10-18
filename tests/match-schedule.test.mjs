import test from "node:test";
import assert from "node:assert/strict";
import { formatMatchSchedule, fromMatchDateInput, toMatchDateInput, getMatchState } from "../lib/match-schedule.js";
import { buildBracket } from "../lib/brackets.js";

test("match editor round-trips Philippine dates independently of the device timezone", () => {
  assert.equal(fromMatchDateInput("2026-10-20T14:30"), "2026-10-20T06:30:00.000Z");
  assert.equal(toMatchDateInput("2026-10-20T06:30:00Z"), "2026-10-20T14:30");
  assert.equal(toMatchDateInput("2026-10-19T16:00:00Z"), "2026-10-20T00:00");
  assert.match(formatMatchSchedule("2026-10-19T16:00:00Z").date, /20/);
});

test("invalid or missing dates stay unset rather than rolling into another date", () => {
  for (const value of ["", null, "not-a-date", "2026-02-30T14:00", "2026-10-20T25:00"]) assert.equal(fromMatchDateInput(value), null);
  assert.equal(formatMatchSchedule(null), null);
  assert.equal(formatMatchSchedule("invalid"), null);
});

test("passing a scheduled time does not automatically mark a match live or completed", () => {
  assert.equal(getMatchState({ status: "scheduled", scheduled_at: "2020-01-01T00:00:00Z" }).key, "scheduled");
  assert.equal(getMatchState({ status: "scheduled", scheduled_at: null }).key, "pending");
  assert.equal(getMatchState({ status: "live" }).key, "live");
  assert.equal(getMatchState({ status: "complete" }).key, "complete");
});

const teamA = { id: "a", team_name: "Alpha" };
const teamB = { id: "b", team_name: "Beta" };

test("unpublished pairings have no schedule or automatic advancement", () => {
  const bracket = buildBracket({ entrants: [teamA, teamB, { id: "c", team_name: "Gamma" }] });
  assert.equal(bracket.rounds[0].matches.length, 2);
  for (const match of bracket.rounds[0].matches) {
    assert.equal(getMatchState(match).key, "preview");
    assert.equal(match.scheduled_at, null);
    assert.equal(match.bye, false);
  }
});

test("a missing future opponent is not a bye; recorded solo advancement is", () => {
  const bracket = buildBracket({ entrants: [teamA], matches: [
    { id: "pending", round_number: 2, match_number: 1, teamA, teamB: null, status: "scheduled" },
    { id: "bye", round_number: 1, match_number: 2, teamA, teamB: null, status: "complete", winner: teamA },
  ] });
  assert.equal(bracket.rounds[0].matches[0].bye, true);
  assert.equal(bracket.rounds[1].matches[0].bye, false);
});

test("published matches preserve their schedule, participants, scores, and order", () => {
  const scheduled_at = "2026-10-20T06:30:00Z";
  const bracket = buildBracket({ entrants: [], matches: [
    { id: "2", round_number: 1, match_number: 2, teamA, teamB, status: "live", scheduled_at, team_a_score: 3, team_b_score: 2 },
    { id: "1", round_number: 1, match_number: 1, status: "scheduled", scheduled_at },
  ] });
  assert.deepEqual(bracket.rounds[0].matches.map((match) => match.id), ["1", "2"]);
  const match = bracket.rounds[0].matches[1];
  assert.equal(match.scheduled_at, scheduled_at);
  assert.equal(match.team_a_score, 3);
  assert.equal(match.teamB.team_name, "Beta");
});
