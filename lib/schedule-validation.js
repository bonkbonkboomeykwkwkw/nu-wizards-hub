import { fromMatchDateInput, toMatchDateInput } from "./match-schedule.js";

// Round up because datetime-local inputs have minute precision.
export function minimumScheduleInput(now = Date.now()) {
  return toMatchDateInput(new Date(Math.ceil(now / 60_000) * 60_000));
}

export function resolveScheduleInput(value, previous) {
  if (!value) return null;
  // Preserve seconds on existing records when the displayed minute is unchanged.
  if (previous && value === toMatchDateInput(previous)) return previous;
  return fromMatchDateInput(value);
}

export function validateScheduleDate(value, { previous, required = false, label = "Date and time", now = Date.now() } = {}) {
  if (value === null || value === undefined || value === "") return required ? `${label} is required.` : null;
  const parts = typeof value === "string" && value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/i);
  const time = parts ? Date.parse(value) : NaN;
  const calendar = parts ? new Date(`${parts[1]}T00:00:00Z`) : null;
  if (!Number.isFinite(time) || !calendar || Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== parts[1] || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4] ?? 0) > 59) {
    return `${label} must be a valid date and time with a timezone.`;
  }
  // Only the persisted value may remain in the past; newly assigned dates may not.
  if (previous && time === Date.parse(previous)) return null;
  return time < now ? `${label} cannot be in the past. Choose today with a time that has not passed, or a future date (PHT).` : null;
}
