#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CONFIG_PATH = resolve(process.cwd(), ".env.bracket-test");
const TEST_TITLE_PREFIX = "TEST ONLY - Bracket progression run ";
const args = process.argv.slice(2);

function readConfigFile() {
  let contents;
  try {
    contents = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return {};
  }

  return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const separator = trimmed.indexOf("=");
    if (separator < 1) return [];
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    return [[key, value]];
  }));
}

function parseOptions() {
  const options = { apply: false, teams: 8, cleanupId: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--apply") options.apply = true;
    else if (args[index] === "--teams") options.teams = Number(args[++index]);
    else if (args[index] === "--cleanup") options.cleanupId = args[++index];
    else if (args[index] === "--help" || args[index] === "-h") options.help = true;
    else throw new Error(`Unknown option: ${args[index]}`);
  }
  return options;
}

function showHelp() {
  console.log(`Seed an isolated single-elimination bracket for automatic winner advancement testing.

Usage:
  node scripts/seed-bracket-demo.mjs [--teams 8]             Preview only (default)
  node scripts/seed-bracket-demo.mjs --teams 8 --apply       Create test tournament
  node scripts/seed-bracket-demo.mjs --cleanup <id> --apply  Delete one test run

Before applying, create .env.bracket-test with:
  BRACKET_TEST_SUPABASE_URL=https://<test-project-ref>.supabase.co
  BRACKET_TEST_SERVICE_ROLE_KEY=<test-project-service-role-key>
  BRACKET_TEST_PROJECT_REF=<test-project-ref>

This script never reads .env.local. Use a separate Supabase test project and its
service-role key. Apply mode verifies that the URL hostname matches the explicitly
configured project ref. Seeded captain emails use the reserved .invalid domain.
`);
}

function getTestClient() {
  const fileConfig = readConfigFile();
  const value = (name) => process.env[name] || fileConfig[name] || "";
  const url = value("BRACKET_TEST_SUPABASE_URL");
  const serviceRoleKey = value("BRACKET_TEST_SERVICE_ROLE_KEY");
  const projectRef = value("BRACKET_TEST_PROJECT_REF");

  if (!url || !serviceRoleKey || !projectRef) {
    throw new Error(`Missing test database settings. Add BRACKET_TEST_SUPABASE_URL, BRACKET_TEST_SERVICE_ROLE_KEY, and BRACKET_TEST_PROJECT_REF to ${CONFIG_PATH}.`);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("BRACKET_TEST_SUPABASE_URL must be a valid URL.");
  }
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== `${projectRef}.supabase.co`) {
    throw new Error("Safety check failed: the URL must be https://<BRACKET_TEST_PROJECT_REF>.supabase.co for a dedicated test project.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildMatches(tournamentId, teams, teamCount) {
  const matches = [];
  for (let matchNumber = 1; matchNumber <= teamCount / 2; matchNumber += 1) {
    const teamIndex = (matchNumber - 1) * 2;
    const scheduledAt = new Date(Date.now() + 86_400_000 + matchNumber * 3_600_000);
    matches.push({
      tournament_id: tournamentId,
      round_number: 1,
      match_number: matchNumber,
      team_a_id: teams[teamIndex].id,
      team_b_id: teams[teamIndex + 1].id,
      winner_id: null,
      team_a_score: 0,
      team_b_score: 0,
      status: "scheduled",
      scheduled_at: scheduledAt.toISOString(),
    });
  }
  return matches;
}

async function deleteTestRun(supabase, tournamentId) {
  const { data: tournament, error: lookupError } = await supabase
    .from("tournaments")
    .select("id, title")
    .eq("id", tournamentId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!tournament) throw new Error("No tournament found with that ID.");
  if (!tournament.title.startsWith(TEST_TITLE_PREFIX)) {
    throw new Error("Refusing cleanup: this tournament was not created by the bracket demo script.");
  }

  const { data: teams, error: teamsLookupError } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId);
  if (teamsLookupError) throw teamsLookupError;
  const teamIds = (teams ?? []).map(({ id }) => id);

  if (teamIds.length) {
    const { error } = await supabase.from("players").delete().in("team_id", teamIds);
    if (error) throw error;
  }
  const { error: matchesError } = await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId);
  if (matchesError) throw matchesError;
  if (teamIds.length) {
    const { error } = await supabase.from("teams").delete().in("id", teamIds);
    if (error) throw error;
  }
  const { error: tournamentError } = await supabase.from("tournaments").delete().eq("id", tournamentId);
  if (tournamentError) throw tournamentError;
  console.log(`Deleted test tournament ${tournamentId} and its demo teams/matches.`);
}

async function seed(supabase, teamCount) {
  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 7)}`;
  const tournamentTitle = `${TEST_TITLE_PREFIX}${runId}`;
  let tournamentId;

  try {
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        title: tournamentTitle,
        game_name: "Bracket Demo Game",
        team_format: "5v5",
        max_team_size: 5,
        registration_status: "Closed",
        details: "Synthetic data for testing automatic bracket progression. Not a real tournament.",
      })
      .select("id, title")
      .single();
    if (tournamentError) throw tournamentError;
    tournamentId = tournament.id;

    const teamRows = Array.from({ length: teamCount }, (_, index) => ({
      tournament_id: tournamentId,
      team_name: `DEMO ${runId} - Team ${String(index + 1).padStart(2, "0")}`,
      captain_email: `bracket-demo-${runId}-${String(index + 1).padStart(2, "0")}@example.invalid`,
      facebook_url: `https://facebook.com/bracket-demo-${runId}-${index + 1}`,
      privacy_consent_at: new Date().toISOString(),
    }));
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .insert(teamRows)
      .select("id, team_name");
    if (teamsError) throw teamsError;

    const matches = buildMatches(tournamentId, teams, teamCount);
    const { error: matchesError } = await supabase.from("tournament_matches").insert(matches);
    if (matchesError) throw matchesError;

    console.log(`Created ${tournament.title}`);
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Teams: ${teams.length} | Seeded first-round matches: ${matches.length} | Expected rounds: ${Math.log2(teamCount)}`);
    console.log("Only Round 1 is seeded. Save each winner in Admin; later rounds and their team slots should be created automatically.");
    console.log(`Open /bracketing to view it. Cleanup: node scripts/seed-bracket-demo.mjs --cleanup ${tournamentId} --apply`);
  } catch (error) {
    if (tournamentId) {
      try {
        await deleteTestRun(supabase, tournamentId);
      } catch (cleanupError) {
        console.error(`Automatic cleanup failed for ${tournamentId}: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

async function main() {
  const options = parseOptions();
  if (options.help) return showHelp();

  if (options.cleanupId && !options.apply) {
    throw new Error("Cleanup writes to the database. Add --apply after reviewing the tournament ID.");
  }
  if (!options.cleanupId && (!Number.isInteger(options.teams) || options.teams < 2 || options.teams > 32 || (options.teams & (options.teams - 1)) !== 0)) {
    throw new Error("--teams must be a power of two from 2 through 32 (for example, 4, 8, or 16).");
  }

  if (!options.apply) {
    console.log(`Dry run: would create a ${options.teams}-team single-elimination test bracket with ${options.teams / 2} seeded first-round matches across ${Math.log2(options.teams)} expected rounds.`);
    console.log("No database was contacted or changed. Add --apply only after configuring a dedicated test Supabase project.");
    return;
  }

  const supabase = getTestClient();
  if (options.cleanupId) await deleteTestRun(supabase, options.cleanupId);
  else await seed(supabase, options.teams);
}

main().catch((error) => {
  console.error(`Bracket demo script failed: ${error.message}`);
  process.exitCode = 1;
});
