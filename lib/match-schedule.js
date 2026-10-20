export const MATCH_TIME_ZONE = "Asia/Manila";

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMatchSchedule(value) {
  const date = validDate(value);
  if (!date) return null;
  return {
    date: new Intl.DateTimeFormat("en-PH", { timeZone: MATCH_TIME_ZONE, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-PH", { timeZone: MATCH_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(date),
    iso: date.toISOString(),
  };
}

// datetime-local has no timezone: always read and write the match editor in PHT.
export function toMatchDateInput(value) {
  const date = validDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MATCH_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

export function fromMatchDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value ?? "")) return null;
  const date = validDate(`${value}:00+08:00`);
  // Reject impossible dates that Date would otherwise silently normalize.
  return date && toMatchDateInput(date) === value ? date.toISOString() : null;
}

export function getMatchState(match) {
  if (match.is_preview) return { key: "preview", label: "Pairing preview" };
  if (match.bye) return { key: "bye", label: "Bye" };
  if (match.status === "complete") return { key: "complete", label: "Completed" };
  if (match.status === "live") return { key: "live", label: "Live" };
  if (formatMatchSchedule(match.scheduled_at)) return { key: "scheduled", label: "Scheduled" };
  return { key: "pending", label: "Schedule pending" };
}

export function matchesStatusFilter(match, filter) {
  if (filter === "all") return true;
  // Previews and unscheduled matches remain discoverable under All matches.
  // Recorded byes belong with completed results, not a separate filter category.
  if (match.is_preview) return false;
  if (filter === "complete") return match.status === "complete";
  return getMatchState(match).key === filter;
}
