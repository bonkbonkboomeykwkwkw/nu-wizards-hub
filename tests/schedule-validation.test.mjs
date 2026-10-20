import test from "node:test";
import assert from "node:assert/strict";
import { minimumScheduleInput, resolveScheduleInput, validateScheduleDate } from "../lib/schedule-validation.js";

const now = Date.parse("2026-10-20T12:00:30+08:00");
const validate = (value, options = {}) => validateScheduleDate(value, { now, ...options });

test("rejects yesterday and earlier today, accepts now and future times", () => {
  for (const value of ["2026-10-19T18:00:00+08:00", "2026-10-20T11:59:00+08:00", "2026-10-20T12:00:00+08:00"]) {
    assert.match(validate(value), /cannot be in the past/);
  }
  for (const value of ["2026-10-20T12:00:30+08:00", "2026-10-20T04:00:30Z", "2026-10-20T12:01:00+08:00", "2026-10-21T00:00:00+08:00"]) {
    assert.equal(validate(value), null);
  }
});

test("requires explicit timezone and rejects malformed or impossible dates", () => {
  for (const value of [false, 123, {}, "invalid", "2026-10-21", "2026-10-21T10:00", "2027-02-30T12:00:00Z", "2027-01-01T24:00:00Z", "2027-01-01T12:60:00Z", "2027-01-01T12:00:60Z", "2027-01-01T12:00:00+25:00"]) {
    assert.match(validate(value), /valid date and time with a timezone/);
  }
});

test("allows empty optional tournament dates but requires a match date", () => {
  for (const value of [null, undefined, ""]) {
    assert.equal(validate(value), null);
    assert.equal(validate(value, { required: true, label: "Match date and time" }), "Match date and time is required.");
  }
});

test("preserves historical dates only when the saved instant is unchanged", () => {
  const previous = "2026-10-18T12:30:45+08:00";
  assert.equal(validate(previous, { previous }), null);
  assert.equal(validate("2026-10-18T04:30:45Z", { previous }), null);
  assert.match(validate("2026-10-18T12:31:00+08:00", { previous }), /cannot be in the past/);
  assert.equal(validate("2026-10-21T12:31:00+08:00", { previous }), null);
});

test("minimum input rounds up to an available minute in PHT regardless of device timezone", () => {
  assert.equal(minimumScheduleInput(now), "2026-10-20T12:01");
  assert.equal(minimumScheduleInput(Date.parse("2026-10-20T04:00:00Z")), "2026-10-20T12:00");
  assert.equal(minimumScheduleInput(Date.parse("2026-10-20T15:59:31Z")), "2026-10-21T00:00");
});

test("input conversion preserves saved seconds but treats edits as new dates", () => {
  const previous = "2026-10-18T04:30:45.123Z";
  assert.equal(resolveScheduleInput("2026-10-18T12:30", previous), previous);
  assert.equal(resolveScheduleInput("2026-10-21T12:31", previous), "2026-10-21T04:31:00.000Z");
  assert.equal(resolveScheduleInput("", previous), null);
  assert.equal(resolveScheduleInput("2027-02-30T12:31"), null);
});

test("rechecks current time on submit instead of accepting a stale form selection", () => {
  const selected = "2026-10-20T12:01:00+08:00";
  assert.equal(validate(selected), null);
  assert.match(validateScheduleDate(selected, { now: now + 60_000 }), /cannot be in the past/);
});
