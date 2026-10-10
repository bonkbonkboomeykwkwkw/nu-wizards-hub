"use client";

import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";

async function fetchRegistration(registrationId) {
  const response = await fetch("/api/registrations/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registrationId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to check this registration.");
  return data;
}

export default function CheckRegistrationPage() {
  const [registrationId, setRegistrationId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const idFromQrCode = new URLSearchParams(window.location.search).get("registrationId");
    if (!idFromQrCode) return;

    Promise.resolve()
      .then(() => {
        setRegistrationId(idFromQrCode);
        setLoading(true);
        return fetchRegistration(idFromQrCode);
      })
      .then((data) => setResult(data))
      .catch((lookupError) => setError(lookupError.message || "Unable to check this registration."))
      .finally(() => setLoading(false));
  }, []);

  async function checkRegistration(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    try {
      setResult(await fetchRegistration(registrationId));
    } catch (lookupError) {
      setError(lookupError.message || "Unable to check this registration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <SiteNav />
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-yellow-500">NU Wizards Tournament Hub</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Check your registration</h1>
        <p className="mt-4 text-slate-400">Enter the registration ID shown on your receipt to confirm your team was saved.</p>

        <form onSubmit={checkRegistration} className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-8">
          <label htmlFor="registration-id" className="block text-sm font-semibold text-slate-200">Registration ID</label>
          <input
            id="registration-id"
            name="registrationId"
            type="text"
            required
            autoComplete="off"
            spellCheck="false"
            value={registrationId}
            onChange={(event) => setRegistrationId(event.target.value)}
            placeholder="Paste the ID from your receipt"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-yellow-500"
          />
          <button type="submit" disabled={loading} className="mt-5 w-full rounded-lg bg-yellow-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Checking…" : "Check registration"}
          </button>

          {error && <p role="alert" className="mt-5 rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">{error}</p>}
          {result?.registered === true && (
            <div role="status" className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4">
              <p className="font-bold text-emerald-300">Registration found</p>
              <p className="mt-1 text-sm text-slate-200">Team: {result.teamName}</p>
              {result.registeredAt && <p className="mt-1 text-sm text-slate-400">Submitted: {new Date(result.registeredAt).toLocaleString()}</p>}
            </div>
          )}
          {result?.registered === false && (
            <p role="status" className="mt-5 rounded-lg border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">We couldn’t find a registration with that ID. Check the ID on your receipt and try again.</p>
          )}
        </form>
      </section>
    </main>
  );
}
