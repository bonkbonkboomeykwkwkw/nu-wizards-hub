import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesStatusFilter } from "../lib/match-schedule.js";

const scheduled = { status: "scheduled", scheduled_at: "2026-10-24T05:00:00Z" };
const live = { ...scheduled, status: "live" };
const completed = { ...scheduled, status: "complete" };
const bye = { bye: true, status: "complete" };
const preview = { is_preview: true, status: "scheduled" };
const pending = { status: "scheduled", scheduled_at: null };

test("filter menu offers only the four main match categories", () => {
  const source = readFileSync(new URL("../app/bracketing/page.jsx", import.meta.url), "utf8");
  const options = [...source.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(options, [["all", "All matches"], ["scheduled", "Scheduled"], ["live", "Live"], ["complete", "Completed"]]);
});

test("All matches still includes unscheduled matches, previews, and byes", () => {
  for (const match of [scheduled, live, completed, bye, preview, pending]) {
    assert.equal(matchesStatusFilter(match, "all"), true);
  }
});

test("Scheduled and Live show only their respective saved matches", () => {
  const matches = [scheduled, live, completed, bye, preview, pending];
  assert.deepEqual(matches.filter((match) => matchesStatusFilter(match, "scheduled")), [scheduled]);
  assert.deepEqual(matches.filter((match) => matchesStatusFilter(match, "live")), [live]);
});

test("Completed includes recorded byes without requiring a separate category", () => {
  const matches = [scheduled, live, completed, bye, preview, pending];
  assert.deepEqual(matches.filter((match) => matchesStatusFilter(match, "complete")), [completed, bye]);
});
