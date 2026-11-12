import React, { useEffect, useState, useCallback } from 'react';
import { X, Plus, Trash2, Lock, Upload, Image, Settings, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  createProfile,
  deleteProfile,
  ensureUserHasProfile,
  getUserProfiles,
  updateProfile,
  setProfilePin,
  removeProfilePin,
  verifyProfilePin,
  profileToSelected,
  type Profile,
} from '../lib/profiles';
import { setSelectedProfile } from '../lib/selected-profile';

const COLORS = [
  'from-rose-500 to-red-700',
  'from-sky-500 to-indigo-700',
  'from-amber-400 to-orange-600',
  'from-emerald-400 to-teal-600',
  'from-violet-500 to-purple-700',
  'from-pink-500 to-rose-700',
  'from-cyan-500 to-blue-700',
  'from-lime-400 to-green-600',
];

const GENRE_OPTIONS = [
  { id: 16, name: 'Animation' },
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
];

export function ProfileChooser({ onClose }: { onClose: () => void }) {
  const { user, profiles, selectProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profilesList, setProfilesList] = useState<Profile[]>(profiles);
  const [editTarget, setEditTarget] = useState<Profile | 'new' | null>(null);
  const [pinTarget, setPinTarget] = useState<Profile | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [pickedGenres, setPickedGenres] = useState<number[]>([]);
  const [onboardBusy, setOnboardBusy] = useState(false);
  const [profilesExpanded, setProfilesExpanded] = useState(false);

  useEffect(() => {
    setProfilesList(profiles);
  }, [profiles]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await ensureUserHasProfile(user.uid, user.displayName || user.email?.split('@')[0] || 'Profile');
        if (!cancelled) setProfilesList(list);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user]);

  const loadProfiles = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getUserProfiles(user.uid);
      setProfilesList(list);
    } catch {}
  }, [user]);

  const choose = useCallback((p: Profile) => {
    if (!editing) {
      if (p.pinHash) {
        setPinTarget(p);
        setPinValue('');
        return;
      }
    }
    selectProfile(profileToSelected(p));
    onClose();
  }, [editing, selectProfile, onClose]);

  const verifyPinAndSelect = useCallback(async () => {
    if (!user || !pinTarget) return;
    setPinBusy(true);
    try {
      const ok = await verifyProfilePin(user.uid, pinTarget.id, pinValue);
      if (ok) {
        selectProfile(profileToSelected(pinTarget));
        setPinTarget(null);
        setPinValue('');
        onClose();
      } else {
        toast.error('Incorrect PIN');
      }
    } catch {
      toast.error('Failed to verify PIN');
    }
    setPinBusy(false);
  }, [user, pinTarget, pinValue, selectProfile, onClose]);

  return (
    <div className="fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-hidden bg-background">
      <div className="relative z-20 w-full max-w-4xl px-4 text-center">
        <header className="absolute inset-x-0 top-0 px-4 sm:px-12 py-5 z-10 flex items-center justify-between">
          <div className="font-display text-2xl text-[#e50914] tracking-wider">ANIFLIX</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigateToSettings'))}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Settings"
          >
            <Settings className="size-5" />
          </button>
        </header>
        <h1 className="text-3xl font-medium sm:text-5xl">{editing ? 'Manage Profiles:' : "Who's watching?"}</h1>

        {profilesList === null ? (
          <div className="mt-20 text-center text-zinc-400">Loading profiles...</div>
        ) : (
          <>
            <ul className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-8">
              {(profilesExpanded ? profilesList : profilesList.slice(0, 5)).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => (editing ? setEditTarget(p) : choose(p))}
                    className="group flex flex-col items-center gap-3"
                  >
                    <div
                      className={`relative size-28 overflow-hidden rounded-lg transition-all group-hover:ring-4 group-hover:ring-foreground sm:size-32 ${p.avatarUrl ? '' : `bg-gradient-to-br ${p.color}`}`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-2xl font-black text-white/90 sm:text-5xl">
                          {p.name[0]?.toUpperCase()}
                        </span>
                      )}
                      {p.pinHash && !editing && (
                        <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 text-foreground ring-1 ring-zinc-800 sm:size-6" title="Locked profile">
                          <Lock className="size-3 sm:size-3.5" />
                        </span>
                      )}
                      {editing && (
                        <div className="absolute inset-0 grid place-items-center bg-black/60">
                          <Pencil className="size-7 text-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                      {p.name}{' '}
                      {p.kids && (
                        <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          Kids
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
              {profilesList.length < 5 && (
                <li>
                  <button onClick={() => setEditTarget('new')} className="group flex flex-col items-center gap-3">
                    <div className="grid size-28 place-items-center rounded-lg border border-dashed border-zinc-700 text-zinc-400 transition-colors group-hover:border-zinc-400 group-hover:text-white sm:size-32">
                      <Plus className="size-8 sm:size-10" />
                    </div>
                    <span className="text-zinc-400">Add Profile</span>
                  </button>
                </li>
              )}
              {profilesList.length > 5 && (
                <button
                  onClick={() => setProfilesExpanded((v) => !v)}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition"
                >
                  {profilesExpanded ? (
                    <>
                      Show less <ChevronUp className="size-3.5" />
                    </>
                  ) : (
                    <>
                      Show all {profilesList.length} <ChevronDown className="size-3.5" />
                    </>
                  )}
                </button>
              )}
            </ul>
            <button
              onClick={() => setEditing((v) => !v)}
              className="mt-8 rounded border border-zinc-700 px-6 py-2 text-xs tracking-widest text-zinc-400 transition-colors hover:border-white hover:text-white uppercase sm:mt-12"
            >
              {editing ? 'Done' : 'Manage Profiles'}
            </button>
          </>
        )}
      </div>

      {editTarget && (
        <ProfileEditor
          target={editTarget}
          existingCount={profilesList.length}
          onClose={() => setEditTarget(null)}
          onSaved={async () => {
            setEditTarget(null);
            await loadProfiles();
          }}
        />
      )}

      {pinTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-lg bg-[#18181f] p-6 shadow-2xl text-center border border-zinc-800">
            <Lock className="mx-auto size-10 text-zinc-400 mb-4" />
            <h2 className="text-xl font-semibold mb-1">Enter PIN</h2>
            <p className="text-sm text-zinc-400 mb-6">Enter PIN for "{pinTarget.name}"</p>
            <input
              type="password"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              maxLength={6}
              autoFocus
              placeholder="Enter PIN"
              className="w-full rounded bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') verifyPinAndSelect();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPinTarget(null);
                  setPinValue('');
                }}
                className="flex-1 rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={verifyPinAndSelect}
                disabled={pinBusy || !pinValue.trim()}
                className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {pinBusy ? 'Verifying…' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {onboardOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/90 p-4">
          <div className="w-full max-w-xl rounded-lg bg-[#18181f] p-6 shadow-2xl sm:p-8 border border-zinc-800">
            <h2 className="text-2xl font-semibold">What do you like to watch?</h2>
            <p className="mt-1 text-sm text-zinc-400">Pick up to 5 genres and we'll personalize your recommendations.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => {
                const selected = pickedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      setPickedGenres((cur) => {
                        if (cur.includes(g.id)) return cur.filter((id) => id !== g.id);
                        if (cur.length >= 5) {
                          toast.error('You can pick up to 5 genres');
                          return cur;
                        }
                        return [...cur, g.id];
                      })
                    }
                    className={`rounded-full border px-4 py-2 text-sm transition ${selected ? 'border-red-600 bg-red-600/20 text-red-400' : 'border-zinc-700 text-zinc-400 hover:border-red-600/60'}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">{pickedGenres.length}/5 picked</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOnboardOpen(false);
                  }}
                  className="rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    try { localStorage.setItem('aniflix:onboarded', '1'); } catch {}
                    setOnboardOpen(false);
                  }}
                  disabled={onboardBusy || pickedGenres.length === 0}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {onboardBusy ? 'Saving…' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileEditor({
  target,
  existingCount,
  onClose,
  onSaved,
}: {
  target: Profile | 'new';
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === 'new';
  const existing = isNew ? null : (target as Profile);
  const [name, setName] = useState(existing?.name ?? '');
  const [kids, setKids] = useState(existing?.kids ?? false);
  const [color, setColor] = useState(existing?.color ?? COLORS[existingCount % COLORS.length]);
  const [avatarUrl, setAvatarUrl] = useState(existing?.avatarUrl ?? '');
  const [pin, setPin] = useState('');
  const [hasPin, setHasPin] = useState(existing?.pinHash ? true : false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const querySave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (isNew) {
        await createProfile(user.uid, {
          name: name.trim(),
          kids,
          avatarUrl: avatarUrl.trim() || undefined,
        });
        toast.success('Profile added');
      } else if (existing) {
        await updateProfile(user.uid, existing.id, {
          name: name.trim(),
          kids,
          color,
          avatarUrl: avatarUrl.trim() || '',
        });
        if (pin.trim()) {
          await setProfilePin(user.uid, existing.id, pin.trim());
        }
        toast.success('Profile updated');
      }
      onClose();
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? 'Couldn\'t save profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-lg bg-[#18181f] p-4 shadow-2xl max-h-[92dvh] overflow-y-auto sm:p-6 border border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{isNew ? 'Add Profile' : 'Edit Profile'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-20 rounded-lg object-cover ring-2 ring-zinc-700" />
          ) : (
            <div className={`grid size-20 place-items-center rounded-lg bg-gradient-to-br ${color} text-3xl font-black text-white/90`}>
              {(name || '?')[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 w-full space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Profile name"
              className="w-full rounded bg-zinc-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement | null;
                    if (target?.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = () => setAvatarUrl(String(reader.result));
                      reader.readAsDataURL(target.files[0]);
                    }
                  };
                  input.click();
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                <Upload className="size-3.5" /> Upload
              </button>
              {avatarUrl && (
                <button
                  onClick={() => {
                    setAvatarUrl('');
                    toast.success('Avatar removed');
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/40"
                >
                  <X className="size-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {(avatarUrl === '') && (
          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-400">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`size-9 rounded-md bg-gradient-to-br ${c} ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181f]' : ''}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Kids profile</p>
            <p className="text-xs text-zinc-500">Filters out mature titles so kids only see age-appropriate content.</p>
          </div>
          <button
            role="switch"
            aria-checked={kids}
            onClick={() => setKids((v) => !v)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${kids ? 'bg-emerald-500' : 'bg-zinc-800'}`}
          >
            <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${kids ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="mt-4">
          {!hasPin ? (
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Parental PIN (optional)"
              maxLength={6}
              className="w-full rounded bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded border border-zinc-700 px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Lock className="size-3.5" /> A PIN is currently set
              </p>
            </div>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          {!isNew && existingCount > 1 && (
            <button
              onClick={() => {
                if (existing && user) {
                  deleteProfile(user.uid, existing.id).then(() => {
                    toast.success('Profile deleted');
                    onClose();
                  }).catch((e: any) => {
                    toast.error(e?.message ?? 'Couldn\'t delete');
                  });
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-red-500 hover:text-red-400 disabled:opacity-60"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={onClose} disabled={busy} className="rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
              Cancel
            </button>
            <button onClick={querySave} disabled={busy} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
