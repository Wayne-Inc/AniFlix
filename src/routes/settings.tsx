import {
  LogOut,
  Mail,
  User as UserIcon,
  ShieldCheck,
  KeyRound,
  EyeOff,
  Trash2,
  Upload,
  Loader2,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConnectedAccounts } from "@/components/ConnectedAccounts";
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDeviceId, parseUserAgent, recordCurrentDevice } from "@/lib/device-tracking";
import { useReduceMotion } from "@/lib/reduce-motion";
import { formatDistanceToNow } from "date-fns";

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/** One card, so every settings section shares the same rhythm. */
function Section({ icon, title, description, children, className = "" }: SectionProps) {
  return (
    <section
      className={`rounded-xl border border-zinc-800 bg-[#17171c]/80 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

type Device = {
  id: string;
  device_id: string;
  device_label: string;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  last_seen_at: Timestamp | null;
  created_at: Timestamp | null;
};

function deviceIcon(label: string) {
  if (/Mobile/i.test(label)) return Smartphone;
  if (/Tablet/i.test(label)) return Tablet;
  return Monitor;
}

function formatLastSeen(ts: Timestamp | null): string {
  if (!ts) return "unknown";
  try {
    return formatDistanceToNow(ts.toDate(), { addSuffix: true });
  } catch {
    return "unknown";
  }
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { reduceMotion, setReduceMotion } = useReduceMotion();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Record current device on mount
  useEffect(() => {
    if (user) {
      recordCurrentDevice();
    }
  }, [user]);

  const currentDeviceId = getDeviceId();

  const providers = user?.providerData ?? [];
  const canChangePassword = !!user?.email && providers.some((p) => p.providerId === "password");
  const createdAt = user?.metadata?.creationTime ?? null;

  // Seed the field with the saved name instead of leaving it blank.
  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  // Fetch user devices
  const devicesQ = useQuery({
    queryKey: ["user_devices", user?.uid],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Device[]> => {
      if (!user) return [];
      const q = query(collection(db, "user_devices"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Device)
        .sort((a, b) => {
          const ta = a.last_seen_at?.toDate().getTime() ?? 0;
          const tb = b.last_seen_at?.toDate().getTime() ?? 0;
          return tb - ta;
        });
    },
  });

  const deviceQueryKey = ["user_devices", user?.uid] as const;

  // Remove a single device
  const removeDevice = useMutation({
    mutationFn: async (d: Device) => {
      if (d.device_id === currentDeviceId) return;
      const res = await fetch("/api/revoke-device-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: d.id }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onMutate: async (d: Device) => {
      if (d.device_id === currentDeviceId) return { prev: undefined };
      await qc.cancelQueries({ queryKey: deviceQueryKey });
      const prev = qc.getQueryData<Device[]>(deviceQueryKey);
      qc.setQueryData<Device[]>(deviceQueryKey, (old) =>
        (old ?? []).filter((dev) => dev.id !== d.id),
      );
      return { prev };
    },
    onError: (e: Error, _d, context) => {
      if (context?.prev) qc.setQueryData(deviceQueryKey, context.prev);
      const msg =
        e.message?.includes("CORS") || e.message?.includes("Failed to fetch")
          ? "Unable to reach the server (CORS/network issue). Please try again later."
          : e.message;
      toast.error(msg);
    },
    onSuccess: () => {
      toast.success("Device session revoked");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: deviceQueryKey });
    },
  });

  // Remove all other devices
  const removeAllOthers = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const res = await fetch("/api/revoke-other-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentDeviceId }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: deviceQueryKey });
      const prev = qc.getQueryData<Device[]>(deviceQueryKey);
      qc.setQueryData<Device[]>(deviceQueryKey, (old) =>
        (old ?? []).filter((d) => d.device_id === currentDeviceId),
      );
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) qc.setQueryData(deviceQueryKey, context.prev);
      const msg =
        e.message?.includes("CORS") || e.message?.includes("Failed to fetch")
          ? "Unable to reach the server (CORS/network issue). Please try again later."
          : e.message;
      toast.error(msg);
    },
    onSuccess: () => {
      toast.success("Signed out of all other devices");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: deviceQueryKey });
    },
  });

  const saveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      toast.success("Display name updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingName(false);
    }
  };

  const sendResetEmail = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send password reset email");
    } finally {
      setSendingReset(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const hasPassword = providers.some((p) => p.providerId === "password");
    if (hasPassword && !deletePassword) {
      toast.error("Enter your password to continue.");
      return;
    }
    setDeletingAccount(true);
    try {
      if (hasPassword && user.email) {
        const credential = EmailAuthProvider.credential(user.email, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }
      await deleteUser(user);
      await signOut();
      toast.success("Your account has been deleted.");
    } catch (e: any) {
      const code = e?.code;
      if (code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (code === "auth/requires-recent-login") {
        toast.error("Please sign in again, then retry deleting your account.");
      } else {
        toast.error(e instanceof Error && e.message ? e.message : "Failed to delete account.");
      }
    } finally {
      setDeletingAccount(false);
      setConfirmDeleteOpen(false);
    }
  };

  const verifyEmail = async () => {
    if (!user) return;
    setVerifyEmailSent(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email sent. Check your inbox.");
    } catch (e: any) {
      setVerifyEmailSent(false);
      toast.error(e.message);
    }
  };

  const onFilePicked = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!user || !avatarUrl) return;
    setSavingName(true);
    try {
      await updateProfile(user, { photoURL: avatarUrl });
      toast.success("Avatar updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const shownAvatar = avatarUrl || user?.photoURL || "";
  const avatarPending = !!avatarUrl && avatarUrl !== (user?.photoURL ?? "");

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased overflow-x-hidden">
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8 lg:py-10 overflow-x-hidden">
        <header className="max-w-3xl">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">Account Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your profile, connected trackers, and security. AniList and MyAnimeList sign-in
            happens here, in Connected accounts.
          </p>
        </header>

        <div className="mt-4 grid gap-4 lg:mt-8 lg:grid-cols-12">
          {/* Main column */}
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <Section
              icon={<UserIcon className="size-4" />}
              title="Profile"
              description="This is how you appear in AniFlix."
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  {shownAvatar ? (
                    <img
                      src={shownAvatar}
                      alt=""
                      className="size-20 rounded-full object-cover ring-2 ring-zinc-700 lg:size-24"
                    />
                  ) : (
                    <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-3xl font-black text-white/90 lg:size-24">
                      {(displayName || user?.email || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs hover:bg-zinc-700"
                    >
                      <Upload className="size-3.5" /> Upload
                    </button>
                    {avatarPending && (
                      <button
                        type="button"
                        onClick={saveAvatar}
                        disabled={savingName}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {savingName ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Save
                      </button>
                    )}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="rounded-md bg-red-900/20 px-3 py-2 text-xs text-red-400 hover:bg-red-900/40"
                      >
                        Discard
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFilePicked(e.target.files?.[0])}
                  />
                </div>

                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-zinc-500">Email</label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-sm">
                      <Mail className="size-4 shrink-0 text-zinc-500" />
                      <span className="min-w-0 truncate">{user?.email ?? "—"}</span>
                      {user?.emailVerified ? (
                        <span className="ml-auto shrink-0 text-emerald-400" aria-label="Verified">
                          <Check className="size-4" />
                        </span>
                      ) : (
                        <button
                          onClick={verifyEmail}
                          disabled={verifyEmailSent}
                          className="ml-auto shrink-0 rounded border border-zinc-700 px-2 py-0.5 text-[10px] hover:bg-zinc-800"
                        >
                          {verifyEmailSent ? "Email sent" : "Verify email"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dn" className="text-xs uppercase tracking-wider text-zinc-500">
                      Display name
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="dn"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-sm outline-none focus:border-red-500"
                      />
                      <button
                        onClick={saveName}
                        disabled={savingName || !displayName.trim()}
                        className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {savingName ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>

                  {createdAt && (
                    <div>
                      <label className="text-xs uppercase tracking-wider text-zinc-500">
                        Member since
                      </label>
                      <div className="mt-1.5 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-sm">
                        {new Date(createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <ConnectedAccounts />

            <Section
              icon={<EyeOff className="size-4" />}
              title="Accessibility"
              description="Customize your viewing experience."
            >
              <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Reduce Motion</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Disable animations and transitions.</p>
                </div>
                <button
                  onClick={() => setReduceMotion(!reduceMotion)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    reduceMotion ? "bg-red-600" : "bg-zinc-800"
                  }`}
                  role="switch"
                  aria-checked={reduceMotion}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                      reduceMotion ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </Section>
          </div>

          {/* Side column */}
          <aside className="space-y-4 lg:col-span-5 xl:col-span-4">
            {canChangePassword && (
              <Section
                icon={<KeyRound className="size-4" />}
                title="Password"
                description="We email you a reset link to set a new password."
              >
                <button
                  onClick={sendResetEmail}
                  disabled={sendingReset}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {sendingReset ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {sendingReset ? "Sending…" : "Send reset email"}
                </button>
              </Section>
            )}

            <Section
              icon={<ShieldCheck className="size-4" />}
              title="Devices signed in"
              description="Recently active devices on your account."
            >
              {devicesQ.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg border border-zinc-800 bg-zinc-900/40 animate-pulse">
                      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-800">
                        <Monitor className="size-5 text-zinc-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-32 bg-zinc-800 rounded"></div>
                        <div className="mt-0.5 h-3 w-40 bg-zinc-800 rounded text-xs"></div>
                      </div>
                      <div className="h-8 w-20 bg-zinc-800 rounded shrink-0"></div>
                    </div>
                  ))}
                </div>
              ) : (devicesQ.data?.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                  No devices recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {devicesQ.data?.map((d) => {
                    const Icon = deviceIcon(d.device_label);
                    const isCurrent = d.device_id === currentDeviceId;
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg border border-zinc-800 bg-zinc-900/40"
                      >
                        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-800">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{d.device_label}</p>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                <CheckCircle2 className="size-3" /> This device
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {d.ip_address ?? "IP unknown"} · Last active {formatLastSeen(d.last_seen_at)}
                          </p>
                        </div>
                        {!isCurrent && (
                          <button
                            onClick={() => removeDevice.mutate(d)}
                            disabled={removeDevice.isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 shrink-0"
                            aria-label="Remove device"
                          >
                            <Trash2 className="size-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {(devicesQ.data?.length ?? 0) > 1 && (
                    <button
                      onClick={() => removeAllOthers.mutate()}
                      disabled={removeAllOthers.isPending}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <LogOut className="size-4" /> Sign out other devices
                    </button>
                  )}
                </div>
              )}
            </Section>

            <Section icon={<LogOut className="size-4" />} title="Sign out" description="End this session on this device.">
              <button
                onClick={handleSignOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 py-2.5 text-sm font-medium hover:bg-zinc-800"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </Section>

            <Section
              icon={<Trash2 className="size-4" />}
              title="Delete account"
              description="Permanently delete your account and all data."
            >
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-900/60 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="size-4" /> Delete account
              </button>
            </Section>
          </aside>
        </div>
      </main>

      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 p-4 sm:p-6"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-xl border border-zinc-800 bg-[#18181f] p-4 sm:p-6 text-center shadow-2lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="mx-auto mb-4 size-10 text-red-500" />
            <h2 className="mb-1 text-xl font-semibold">Delete Account</h2>
            <p className="mb-6 text-sm text-zinc-400">
              This cannot be undone. Enter your password to continue.
            </p>
            {canChangePassword && (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                className="mb-4 w-full rounded bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 rounded border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deletingAccount}
                className="flex-1 rounded bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deletingAccount ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}