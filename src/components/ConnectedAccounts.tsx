import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link2, ArrowUpRight, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AniListSyncError,
  getLastSyncSummary,
  syncAniList,
  type SyncSummary,
} from "@/lib/anilist-sync";
import {
  consumeMalRedirect,
  describeMalError,
  disconnectMal,
  fetchMalUser,
  getMalConnection,
  isMalConfigured,
  MalAuthError,
  saveMalUser,
  startMalLink,
  type MalConnection,
} from "@/lib/mal-auth";
import {
  getLastMalSyncSummary,
  MalSyncError,
  syncMal,
  type MalSyncSummary,
} from "@/lib/mal-sync";
import {
  consumeAniListRedirect,
  describeAniListError,
  disconnectAniList,
  fetchAniListViewer,
  getAniListConnection,
  isAniListConfigured,
  isAniListUnauthorized,
  saveAniListViewer,
  startAniListLink,
  type AniListConnection,
} from "@/lib/anilist-auth";

// Provider cards for the settings page.
//
// AniList is live: Connect sends the browser to AniList, the Vercel callback
// (/api/auth/anilist/callback) swaps the code for a token, and the result comes
// back in the URL fragment where consumeAniListRedirect() picks it up.
//
// MyAnimeList is still a stub. Its token exchange also has to happen server-side
// (MAL sends no CORS headers), but the refresh-token lifecycle is a separate
// piece of work, so the card stays visibly "not available" rather than faking a
// connection.

type Tone = "connected" | "idle" | "error" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  connected: "border-emerald-500/30 text-emerald-300",
  idle: "border-zinc-700 text-zinc-400",
  error: "border-red-500/40 text-red-300",
  warning: "border-amber-500/30 text-amber-300",
};

function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const dot: Record<Tone, string> = {
    connected: "bg-emerald-400",
    idle: "bg-zinc-500",
    error: "bg-red-400",
    warning: "bg-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      <span className={`size-1.5 rounded-full ${dot[tone]}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function ProviderCard({
  mark,
  markClass,
  name,
  pill,
  blurb,
  footer,
}: {
  mark: string;
  markClass: string;
  name: string;
  pill: React.ReactNode;
  blurb: string;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-md bg-gradient-to-br ${markClass} text-base font-black text-white`}
          aria-hidden="true"
        >
          {mark}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            {pill}
          </div>
          <p className="mt-1 text-xs text-zinc-500">{blurb}</p>
        </div>
      </div>
      <div className="mt-4">{footer}</div>
    </div>
  );
}

const BUTTON_CLASS =
  "inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60";

export function ConnectedAccounts() {
  const configured = isAniListConfigured();
  const [connection, setConnection] = useState<AniListConnection | null>(() =>
    getAniListConnection(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(() => getLastSyncSummary());

  const malConfigured = isMalConfigured();
  const [malConnection, setMalConnection] = useState<MalConnection | null>(() => getMalConnection());
  const [malBusy, setMalBusy] = useState(false);
  const [malSyncing, setMalSyncing] = useState(false);
  const [malError, setMalError] = useState<string | null>(null);
  const [malSummary, setMalSummary] = useState<MalSyncSummary | null>(() => getLastMalSyncSummary());
  const handledMalRedirect = useRef(false);
  // Guards against the redirect handler and the on-mount effect both fetching
  // the MAL profile for the same token.
  const malUserLoadStarted = useRef<string | null>(null);
  const handledRedirect = useRef(false);

  // Fetch the AniList username/avatar for an existing token. Failure here means
  // the token was revoked: tell the user instead of showing a stale identity.
  const loadViewer = useCallback(async (token: string) => {
    setBusy(true);
    try {
      const viewer = await fetchAniListViewer(token);
      saveAniListViewer(viewer);
      setConnection(getAniListConnection());
      return viewer;
    } catch (e) {
      const message = e instanceof Error ? e.message : "We couldn't read your AniList account.";
      // A 401 means the stored token was revoked or expired: drop the dead
      // connection instead of showing a linked account that no longer works.
      if (isAniListUnauthorized(e)) {
        disconnectAniList();
        setConnection(null);
        setError("Your AniList connection expired. Please connect again.");
        return null;
      }
      setError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  // Handle the fragment written by /api/auth/anilist/callback, exactly once.
  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;

    const result = consumeAniListRedirect();
    if (!result) return;

    if (result.kind === "error") {
      const message = describeAniListError(result.code);
      setError(message);
      toast.error(message);
      return;
    }

    setConnection(getAniListConnection());
    void loadViewer(result.token).then((viewer) => {
      toast.success(viewer ? `Connected to AniList as ${viewer.name}` : "Connected to AniList");
    });
  }, [loadViewer]);

  // A stored token without cached identity (e.g. cleared storage, new tab).
  useEffect(() => {
    if (!connection?.token || connection.viewer) return;
    void loadViewer(connection.token);
    // Only the token identity matters here; loadViewer is stable.
  }, [connection?.token, connection?.viewer, loadViewer]);

  const connect = () => {
    setError(null);
    try {
      setBusy(true);
      startAniListLink();
    } catch (e) {
      setBusy(false);
      const message = e instanceof Error ? e.message : "Could not start AniList login.";
      setError(message);
      toast.error(message);
    }
  };

  const disconnect = () => {
    disconnectAniList();
    setConnection(null);
    setError(null);
    toast.success("AniList disconnected");
  };

  const runSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncAniList();
      setSummary(result);
      toast.success("Synced with AniList", {
        description: `${result.pushed} pushed · ${result.pulled} pulled · ${result.unmatched} unmatched`,
      });
      if (result.failed > 0) {
        setError(result.errors[0] ?? `${result.failed} title(s) could not be synced.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed.";
      // The stored token is dead: drop the connection so the card stops lying.
      if (e instanceof AniListSyncError && e.code === "unauthorized") {
        disconnectAniList();
        setConnection(null);
      }
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const loadMalUser = useCallback(async (token: string) => {
    if (!token || malUserLoadStarted.current === token) return null;
    malUserLoadStarted.current = token;
    setMalBusy(true);
    try {
      const user = await fetchMalUser(token);
      saveMalUser(user);
      setMalConnection(getMalConnection());
      return user;
    } catch (e) {
      if (e instanceof MalAuthError && e.code === "expired") {
        disconnectMal();
        setMalConnection(null);
        setMalError(e.message);
        return null;
      }
      setMalError(e instanceof Error ? e.message : "Could not read your MyAnimeList account.");
      return null;
    } finally {
      setMalBusy(false);
    }
  }, []);

  useEffect(() => {
    if (handledMalRedirect.current) return;
    handledMalRedirect.current = true;

    const result = consumeMalRedirect();
    if (!result) return;

    if (result.kind === "error") {
      const message = describeMalError(result.code);
      setMalError(message);
      toast.error(message);
      return;
    }

    const stored = getMalConnection();
    setMalConnection(stored);
    void loadMalUser(stored?.token ?? "").then((user) => {
      toast.success(
        user ? `Connected to MyAnimeList as ${user.name}` : "Connected to MyAnimeList",
      );
    });
  }, [loadMalUser]);

  useEffect(() => {
    if (!malConnection?.token || malConnection.user) return;
    void loadMalUser(malConnection.token);
  }, [malConnection?.token, malConnection?.user, loadMalUser]);

  const connectMal = () => {
    setMalError(null);
    try {
      setMalBusy(true);
      startMalLink();
    } catch (e) {
      setMalBusy(false);
      const message = e instanceof Error ? e.message : "Could not start MyAnimeList login.";
      setMalError(message);
      toast.error(message);
    }
  };

  const handleDisconnectMal = () => {
    disconnectMal();
    setMalConnection(null);
    setMalError(null);
    toast.success("MyAnimeList disconnected");
  };

  const runMalSync = async () => {
    setMalSyncing(true);
    setMalError(null);
    try {
      const result = await syncMal();
      setMalSummary(result);
      toast.success("Synced with MyAnimeList", {
        description: `${result.pushed} pushed · ${result.pulled} pulled · ${result.unmatched} unmatched`,
      });
      if (result.failed > 0) {
        setMalError(result.errors[0] ?? `${result.failed} title(s) could not be synced.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed.";
      const expired =
        (e instanceof MalAuthError && e.code === "expired") ||
        (e instanceof MalSyncError && e.code === "expired");
      if (expired) {
        disconnectMal();
        setMalConnection(null);
      }
      setMalError(message);
      toast.error(message);
    } finally {
      setMalSyncing(false);
    }
  };

  const anilistPill = connection ? (
    <StatusPill tone="connected" label="Connected" />
  ) : error ? (
    <StatusPill tone="error" label="Error" />
  ) : configured ? (
    <StatusPill tone="idle" label="Not connected" />
  ) : (
    <StatusPill tone="warning" label="Setup needed" />
  );

  const anilistFooter = connection ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {connection.viewer?.avatarUrl ? (
            <img
              src={connection.viewer.avatarUrl}
              alt=""
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-200">
              {connection.viewer ? connection.viewer.name : "AniList account"}
            </p>
            <p className="text-[10px] text-zinc-500">
              {connection.linkedAt
                ? `Linked ${new Date(connection.linkedAt).toLocaleDateString()}`
                : "Linked"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={disconnect}
          className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Disconnect
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-zinc-400">
            {summary
              ? `Last sync ${new Date(summary.at).toLocaleString()}`
              : "Not synced yet"}
          </p>
          {summary && (
            <p className="truncate text-[10px] text-zinc-500">
              {summary.pushed} pushed · {summary.pulled} pulled
              {summary.failed > 0 ? ` · ${summary.failed} failed` : ""}
              {summary.unmatched > 0 ? ` · ${summary.unmatched} not on AniList` : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          aria-label="Sync with AniList"
          className="inline-flex shrink-0 items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3" aria-hidden="true" />
          )}
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={connect}
      disabled={!configured || busy}
      aria-label="Connect AniList"
      className={BUTTON_CLASS}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      )}
      {configured ? "Connect" : "Not configured"}
    </button>
  );

  const malPill = malConnection ? (
    <StatusPill tone="connected" label="Connected" />
  ) : malError ? (
    <StatusPill tone="error" label="Error" />
  ) : malConfigured ? (
    <StatusPill tone="idle" label="Not connected" />
  ) : (
    <StatusPill tone="warning" label="Setup needed" />
  );

  const malFooter = malConnection ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {malConnection.user?.picture ? (
            <img
              src={malConnection.user.picture}
              alt=""
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-200">
              {malConnection.user ? malConnection.user.name : "MyAnimeList account"}
            </p>
            <p className="text-[10px] text-zinc-500">
              {malConnection.linkedAt
                ? `Linked ${new Date(malConnection.linkedAt).toLocaleDateString()}`
                : "Linked"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDisconnectMal}
          className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Disconnect
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-zinc-400">
            {malSummary
              ? `Last sync ${new Date(malSummary.at).toLocaleString()}`
              : "Not synced yet"}
          </p>
          {malSummary && (
            <p className="truncate text-[10px] text-zinc-500">
              {malSummary.pushed} pushed · {malSummary.pulled} pulled
              {malSummary.failed > 0 ? ` · ${malSummary.failed} failed` : ""}
              {malSummary.unmatched > 0 ? ` · ${malSummary.unmatched} unmatched` : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={runMalSync}
          disabled={malSyncing}
          aria-label="Sync with MyAnimeList"
          className="inline-flex shrink-0 items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {malSyncing ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3" aria-hidden="true" />
          )}
          {malSyncing ? "Syncing…" : "Sync now"}
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={connectMal}
      disabled={!malConfigured || malBusy}
      aria-label="Connect MyAnimeList"
      className={BUTTON_CLASS}
    >
      {malBusy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      )}
      {malConfigured ? "Connect" : "Not configured"}
    </button>
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#17171c]/80 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300">
          <Link2 className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-100">Connected accounts</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Sign in to AniList or MyAnimeList here — your lists stay in sync with AniFlix.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ProviderCard
          mark="A"
          markClass="from-[#02a9ff] to-[#0b6fd6]"
          name="AniList"
          pill={anilistPill}
          blurb="Sign in with AniList to link your account. Your lists sync through AniFlix."
          footer={anilistFooter}
        />
        <ProviderCard
          mark="M"
          markClass="from-[#2e51a2] to-[#1b2f63]"
          name="MyAnimeList"
          pill={malPill}
          blurb="Sync your MyAnimeList status and episode progress alongside AniList."
          footer={malFooter}
        />
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-[11px] text-red-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          AniList: {error}
        </p>
      )}
      {malError && (
        <p className="mt-2 flex items-start gap-2 text-[11px] text-red-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          MyAnimeList: {malError}
        </p>
      )}
      {!error && !malError && (
        <p className="mt-3 text-[11px] text-zinc-600">
          {connection || malConnection
            ? "Connected providers mirror the titles in My List; episode progress comes from the player."
            : "Connecting only grants AniFlix access to the lists on your tracker account."}
        </p>
      )}
    </section>
  );
}
