"use client";

import { useEffect, useState } from "react";
import { toMatchDateInput } from "@/lib/match-schedule";
import { minimumScheduleInput } from "@/lib/schedule-validation";

export default function ScheduleDateInput({ value, previous, onChange, ...props }) {
  const [minimum, setMinimum] = useState("");
  useEffect(() => {
    const update = () => setMinimum(minimumScheduleInput());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const unchanged = previous && value === toMatchDateInput(previous);
  return <input {...props} type="datetime-local" step="60" value={value} min={unchanged ? undefined : minimum || undefined} onFocus={() => setMinimum(minimumScheduleInput())} onChange={onChange} />;
}
