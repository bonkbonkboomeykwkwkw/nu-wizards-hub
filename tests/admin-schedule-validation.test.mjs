import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Exercise the real route with isolated authentication/database doubles. No live writes.
const modules = new Map([
  ["next/server", "data:text/javascript," + encodeURIComponent("export const NextResponse = { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) };")],
  ["@/lib/supabase/auth", "data:text/javascript," + encodeURIComponent("export const requireAdmin = async (request) => request.context;")],
  ["@/lib/schedule-validation", new URL("../lib/schedule-validation.js", import.meta.url).href],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return modules.has(specifier) ? { url: modules.get(specifier), shortCircuit: true } : nextResolve(specifier, context);
  },
});
const { POST } = await import("../app/api/admin/route.js");
hooks.deregister();

const past = "2000-01-01T12:00:00+08:00";
const future = "2099-01-01T12:00:00+08:00";

async function invoke(body, { previous = null, databaseError = null, denied = false } = {}) {
  const writes = [];
  const reads = [];
  const supabase = {
    from(table) {
      return {
        select(columns) {
          return { eq(key, id) {
            reads.push({ table, columns, key, id });
            return { maybeSingle: async () => ({ data: previous, error: databaseError }) };
          } };
        },
        insert(payload) { writes.push({ table, payload }); return Promise.resolve({ error: null }); },
        update(payload) { return { eq() { writes.push({ table, payload }); return Promise.resolve({ error: null }); } }; },
      };
    },
  };
  const response = await POST({
    context: denied ? { error: "Forbidden", status: 403 } : { supabase, user: { id: "admin" } },
    json: async () => body,
  });
  return { ...response, writes, reads };
}

const actions = [
  { action: "saveTournament", field: "tournament", defaults: { title: "Test event" }, dateFields: ["starts_at", "registration_closes_at"] },
  { action: "saveMatch", field: "match", defaults: { tournament_id: "event-1" }, dateFields: ["scheduled_at"] },
];

for (const { action, field, defaults, dateFields } of actions) {
  for (const key of dateFields) {
    const request = (date, extra = {}) => ({ action, [field]: { ...defaults, [key]: date, ...extra } });
    test(`${action}/${key}: rejects new past dates without writing`, async () => {
      const result = await invoke(request(past));
      assert.equal(result.status, 400);
      assert.match(result.body.error, /cannot be in the past/);
      assert.equal(result.writes.length, 0);
    });
    test(`${action}/${key}: accepts future dates and normalizes the timezone`, async () => {
      const result = await invoke(request(future));
      assert.equal(result.status, 200);
      assert.equal(result.writes[0].payload[key], "2099-01-01T04:00:00.000Z");
    });
    test(`${action}/${key}: preserves only the database's saved historical date`, async () => {
      const previous = { [key]: past };
      const allowed = await invoke(request(past, { id: "saved-1" }), { previous });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.reads[0].id, "saved-1");
      assert.equal(allowed.writes.length, 1);
      const blocked = await invoke(request("2000-01-02T12:00:00+08:00", { id: "saved-1", previous: "2000-01-02T12:00:00+08:00" }), { previous });
      assert.equal(blocked.status, 400);
      assert.equal(blocked.writes.length, 0);
    });
    test(`${action}/${key}: missing records and failed lookups cannot bypass validation`, async () => {
      for (const [options, status] of [[{}, 404], [{ databaseError: { message: "Lookup failed" } }, 500]]) {
        const result = await invoke(request(past, { id: "missing" }), options);
        assert.equal(result.status, status);
        assert.equal(result.writes.length, 0);
      }
    });
  }
}

test("admin authorization is still required before date validation or database access", async () => {
  const result = await invoke({ action: "saveTournament", tournament: { title: "Test", starts_at: future } }, { denied: true });
  assert.equal(result.status, 403);
  assert.deepEqual(result.reads, []);
  assert.deepEqual(result.writes, []);
});

test("match schedules remain required while tournament dates remain optional", async () => {
  const tournament = await invoke({ action: "saveTournament", tournament: { title: "Test" } });
  assert.equal(tournament.status, 200);
  assert.equal(tournament.writes[0].payload.starts_at, null);
  const match = await invoke({ action: "saveMatch", match: { tournament_id: "event-1" } });
  assert.equal(match.status, 400);
  assert.equal(match.writes.length, 0);
});
