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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { signOut as firebaseSignOut, sendPasswordResetEmail, sendEmailVerification, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const providers = user?.providerData ?? [];
  const canChangePassword = !!user?.email && providers.some((p) => p.providerId === "password");

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

  const createdAt = user?.metadata?.creationTime ?? null;

  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security, and signed-in devices.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <UserIcon className="size-4" /> Profile
            </h3>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-24 rounded-full object-cover ring-2 ring-zinc-700" />
                ) : user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="size-24 rounded-full object-cover ring-2 ring-zinc-700" />
                ) : (
                  <div className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-4xl font-black text-white/90">
                    {(displayName || user?.email || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="rounded bg-zinc-800 px-3 py-2 text-xs hover:bg-zinc-700">
                    <Upload className="size-3.5" /> Upload
                  </button>
                  {avatarUrl && (
                    <button onClick={() => { setAvatarUrl(""); }} className="rounded bg-red-900/20 px-3 py-2 text-xs hover:bg-red-900/40 text-red-400">
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFilePicked(e.target.files?.[0])} />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wider text-zinc-500">Email</label>
                  <div className="mt-1 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm">
                    <Mail className="size-4 text-zinc-500 shrink-0" />
                    <span className="min-w-0 truncate">{user?.email ?? "—"}</span>
                    {user?.emailVerified ? (
                      <span className="ml-auto size-4 shrink-0 text-emerald-400" aria-hidden="true">✓</span>
                    ) : (
                      <button onClick={verifyEmail} disabled={verifyEmailSent} className="ml-auto shrink-0 rounded border border-zinc-700 px-2 py-0.5 text-[10px] hover:bg-zinc-800">
                        {verifyEmailSent ? "Email sent" : "Verify email"}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="dn" className="text-xs uppercase tracking-wider text-zinc-500">Display name</label>
                  <div className="mt-1 flex gap-2">
                    <input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="flex-1 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm outline-none focus:border-red-500" />
                    <button onClick={saveName} disabled={savingName || !displayName.trim()} className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                      {savingName ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
                {createdAt && (
                  <div>
                    <label className="text-xs uppercase tracking-wider text-zinc-500">Member since</label>
                    <div className="mt-1 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm">
                      {new Date(createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {canChangePassword && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <KeyRound className="size-4" /> Password
              </h3>
              <p className="text-xs text-zinc-500 mb-4">We'll send a password reset link to {user.email}. Follow the link to set a new password.</p>
              <button onClick={sendResetEmail} disabled={sendingReset} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {sendingReset ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {sendingReset ? "Sending..." : "Send reset email"}
              </button>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <EyeOff className="size-4" /> Accessibility
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Customize your viewing experience.</p>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-zinc-700 bg-zinc-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Reduce Motion</p>
                <p className="mt-0.5 text-xs text-zinc-500">Disable animations and transitions.</p>
              </div>
              <button className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-zinc-800" role="switch" aria-checked="false">
                <span className="pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-colors translate-x-0" />
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <ShieldCheck className="size-4" /> Devices signed in
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Recently active devices on your account.</p>
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No devices recorded yet.
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LogOut className="size-4" /> Sign out
                </div>
                <p className="mt-1 text-xs text-zinc-500">End this session on this device.</p>
              </div>
              <button onClick={handleSignOut} className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-800 shrink-0">
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <button onClick={() => setConfirmDeleteOpen(true)} className="text-xs text-red-500 hover:text-red-400">
              Delete account
            </button>
          </div>
        </div>
      </main>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-lg bg-[#18181f] p-6 shadow-2xl text-center border border-zinc-800">
            <Trash2 className="mx-auto size-10 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-1">Delete Account</h2>
            <p className="text-sm text-zinc-400 mb-6">This cannot be undone. Enter your password to continue.</p>
            {canChangePassword && (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteOpen(false)} className="flex-1 rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deletingAccount} className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                {deletingAccount ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
