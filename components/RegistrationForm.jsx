"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const inputClassName =
  "w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20";

export default function RegisterPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [corFile, setCorFile] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([
    { full_name: "", student_id: "", ign: "" },
  ]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId),
    [tournaments, selectedTournamentId],
  );
  const maxTeamSize = Math.min(Number(selectedTournament?.max_team_size) || 1, 5);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadTournaments() {
      try {
        const response = await fetch("/api/tournaments");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load tournaments.");
        const openTournaments = result.tournaments.filter((tournament) =>
          ["open", "active", "true"].includes(
            String(tournament.registration_status ?? "").toLowerCase(),
          ),
        );
        setTournaments(openTournaments);
        if (openTournaments.length === 1) {
          setSelectedTournamentId(openTournaments[0].id);
        }
      } catch (loadError) {
        setError(`Could not load tournaments: ${loadError.message}`);
      } finally {
        setLoadingTournaments(false);
      }
    }

    loadTournaments();
  }, []);

  function updatePlayer(index, field, value) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player,
      ),
    );
  }

  function addPlayer() {
    if (players.length < maxTeamSize) {
      setPlayers((currentPlayers) => [
        ...currentPlayers,
        { full_name: "", student_id: "", ign: "" },
      ]);
    }
  }

  function removePlayer(index) {
    if (index === 0) return;
    setPlayers((currentPlayers) => currentPlayers.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedTeamName = teamName.trim();
    const normalizedPlayers = players.map((player) => ({
      full_name: player.full_name.trim(),
      student_id: player.student_id.trim(),
      ign: player.ign.trim(),
    }));

    if (!selectedTournament) {
      setError("Select an open tournament before submitting.");
      return;
    }
    if (!normalizedTeamName) {
      setError("Enter a team name.");
      return;
    }
    if (!/^https:\/\/(?:[a-z0-9-]+\.)?facebook\.com\//i.test(facebookUrl.trim())) {
      setError("Enter your Facebook profile link, beginning with https://facebook.com/.");
      return;
    }
    if (!corFile) {
      setError("Attach your Certificate of Registration (COR).");
      return;
    }
    if (corFile.size > 10 * 1024 * 1024) {
      setError("Your COR file must be 10 MB or smaller.");
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(corFile.type)) {
      setError("Upload your COR as a PDF, JPG, or PNG file.");
      return;
    }
    if (normalizedPlayers.length < 1 || normalizedPlayers.length > maxTeamSize) {
      setError(`This tournament allows 1 to ${maxTeamSize} player(s) per team.`);
      return;
    }
    const incompletePlayerIndex = normalizedPlayers.findIndex(
      (player) => !player.full_name || !player.student_id || !player.ign,
    );
    if (incompletePlayerIndex !== -1) {
      setError(`Complete all fields for Player ${incompletePlayerIndex + 1}.`);
      return;
    }
    const duplicateStudentIds =
      new Set(normalizedPlayers.map((player) => player.student_id.toLowerCase())).size !==
      normalizedPlayers.length;
    if (duplicateStudentIds) {
      setError("Each player must have a different Student ID.");
      return;
    }

    setSubmitting(true);
    try {
      const fileExtension = corFile.name.split(".").pop()?.toLowerCase() || "file";
      const corPath = `${session.user.id}/${crypto.randomUUID()}.${fileExtension}`;
      const upload = await getSupabaseBrowserClient().storage.from("cor-documents").upload(corPath, corFile, {
        contentType: corFile.type,
        upsert: false,
      });
      if (upload.error) throw new Error(`Could not upload your COR: ${upload.error.message}`);
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          teamName: normalizedTeamName,
          facebookUrl: facebookUrl.trim(),
          corPath,
          players: normalizedPlayers,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Registration failed.");

      router.replace(`/?registration=success&team=${encodeURIComponent(result.teamName)}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? `Registration failed: ${submitError.message}`
          : "Registration failed due to an unexpected error.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="page-fade-in min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-500">
            National University · Wizards
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Tournament Registration
          </h1>
          <p className="mt-3 text-slate-400">
            Register one team with your confirmed captain email.
          </p>
        </header>

        {!session ? <div className="mb-6 rounded-xl border border-yellow-700/60 bg-yellow-950/30 p-5 text-sm text-yellow-200">
          <strong>Email account required.</strong> <a className="ml-2 underline" href="/login">Log in</a> or <a className="underline" href="/signup">sign up and confirm your email</a> before registering.
        </div> : <p className="mb-6 text-center text-sm text-slate-400">Captain email: <span className="font-semibold text-slate-200">{session.user.email}</span> · One registration per email</p>}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          <section className="space-y-5">
            <h2 className="text-lg font-bold text-yellow-500">Team details</h2>
            <div>
              <label htmlFor="team-name" className="mb-2 block text-sm font-medium text-slate-300">
                Team Name
              </label>
              <input
                id="team-name"
                className={inputClassName}
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                maxLength={80}
                required
                placeholder="Enter your team name"
              />
            </div>
            <div>
              <label htmlFor="facebook-url" className="mb-2 block text-sm font-medium text-slate-300">
                Facebook profile link
              </label>
              <input
                id="facebook-url"
                className={inputClassName}
                value={facebookUrl}
                onChange={(event) => setFacebookUrl(event.target.value)}
                type="url"
                required
                placeholder="https://www.facebook.com/your.profile"
              />
              <p className="mt-2 text-xs text-slate-400">Used only by organizers to contact the team captain.</p>
            </div>
            <div>
              <label htmlFor="cor-file" className="mb-2 block text-sm font-medium text-slate-300">
                Certificate of Registration (COR)
              </label>
              <input
                id="cor-file"
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-yellow-500 file:px-3 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-yellow-400"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(event) => setCorFile(event.target.files?.[0] ?? null)}
                required
              />
              <p className="mt-2 text-xs text-slate-400">PDF, JPG, or PNG · maximum 10 MB.</p>
            </div>
            <div>
              <label htmlFor="tournament" className="mb-2 block text-sm font-medium text-slate-300">
                Tournament
              </label>
              <select
                id="tournament"
                className={inputClassName}
                value={selectedTournamentId}
                onChange={(event) => {
                  setSelectedTournamentId(event.target.value);
                  setPlayers([{ full_name: "", student_id: "", ign: "" }]);
                }}
                required
                disabled={loadingTournaments || tournaments.length === 0}
              >
                <option value="">
                  {loadingTournaments ? "Loading tournaments…" : "Select a tournament"}
                </option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title}{tournament.game_name ? ` · ${tournament.game_name}` : ""}
                  </option>
                ))}
              </select>
              {selectedTournament && (
                <p className="mt-2 text-sm text-slate-400">
                  Team size: up to {maxTeamSize} player{maxTeamSize === 1 ? "" : "s"}
                  {selectedTournament.team_format ? ` · ${selectedTournament.team_format}` : ""}
                </p>
              )}
              {!loadingTournaments && tournaments.length === 0 && !error && (
                <p className="mt-2 text-sm text-slate-400">There are no open tournaments right now.</p>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-yellow-500">Players</h2>
                <p className="mt-1 text-sm text-slate-400">Player 1 will be registered as team captain.</p>
              </div>
              <span className="shrink-0 text-sm text-slate-400">
                {players.length}/{maxTeamSize}
              </span>
            </div>

            {players.map((player, index) => (
              <fieldset key={index} className="card-fade-in rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <legend className="px-2 text-sm font-semibold text-slate-200">
                  Player {index + 1}{index === 0 ? " · Captain" : ""}
                </legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`full-name-${index}`} className="mb-2 block text-xs font-medium text-slate-400">
                      Full Name
                    </label>
                    <input
                      id={`full-name-${index}`}
                      className={inputClassName}
                      value={player.full_name}
                      onChange={(event) => updatePlayer(index, "full_name", event.target.value)}
                      maxLength={120}
                      required
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label htmlFor={`student-id-${index}`} className="mb-2 block text-xs font-medium text-slate-400">
                      Student ID
                    </label>
                    <input
                      id={`student-id-${index}`}
                      className={inputClassName}
                      value={player.student_id}
                      onChange={(event) => updatePlayer(index, "student_id", event.target.value)}
                      maxLength={50}
                      required
                      placeholder="Student ID"
                    />
                  </div>
                  <div>
                    <label htmlFor={`ign-${index}`} className="mb-2 block text-xs font-medium text-slate-400">
                      In-Game Name (IGN)
                    </label>
                    <input
                      id={`ign-${index}`}
                      className={inputClassName}
                      value={player.ign}
                      onChange={(event) => updatePlayer(index, "ign", event.target.value)}
                      maxLength={50}
                      required
                      placeholder="In-game name"
                    />
                  </div>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePlayer(index)}
                    className="mt-3 text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-white"
                  >
                    Remove player
                  </button>
                )}
              </fieldset>
            ))}

            <button
              type="button"
              onClick={addPlayer}
              disabled={!selectedTournament || players.length >= maxTeamSize}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-yellow-500 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add player
            </button>
          </section>

          {error && (
            <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
          disabled={submitting || loadingTournaments || !selectedTournament || !session}
            className="w-full rounded-lg bg-yellow-500 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting registration…" : "Complete Entry Registration"}
          </button>
          <p className="text-center text-xs text-slate-500">
            Your registration is saved to the tournament roster after submission.
          </p>
        </form>
      </div>
      </main>
    </>
  );
}
