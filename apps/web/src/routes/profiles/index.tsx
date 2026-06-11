import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Profile } from "@/lib/profile-types";
import { setClientProfileId } from "@/lib/profile-id";
import { profileService } from "@/services/profile.service";
import { Edit2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import Avatar from "boring-avatars";
import FullScreenSpinner from "#/components/fullscreen-spinner";

export const Route = createFileRoute("/profiles/")({
  loader: () => profileService.listProfiles(),
  pendingComponent: PendingProfiles,
  component: ProfilesPage,
});

// Theme colors derived from CSS variables in styles.css (HSL → hex approximations)
const AVATAR_COLORS = ["#6b2d4a", "#c97fa8", "#3d1728", "#8c3d62", "#f0c4d8"];

function PendingProfiles() {
  return <FullScreenSpinner />;
}

function AvatarCircle({ seed, size = 80 }: { seed: string; size?: number }) {
  return <Avatar name={seed} size={size} variant="beam" colors={AVATAR_COLORS} />;
}

function ProfilesPage() {
  const navigate = useNavigate();
  const initialProfiles = Route.useLoaderData();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeed, setNewSeed] = useState(() => nanoid());
  const [creating, setCreating] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAdd) setTimeout(() => newNameRef.current?.focus(), 50);
  }, [showAdd]);

  const handleSelect = (id: string) => {
    if (managing) return;
    setClientProfileId(id);
    void navigate({ to: "/" });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const created = await profileService.createProfile(newName.trim());
    await profileService.updateProfile(created.id, { avatarSeed: newSeed });
    setProfiles((prev) => [...prev, { ...created, avatarSeed: newSeed }]);
    setShowAdd(false);
    setNewName("");
    setNewSeed(nanoid());
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await profileService.deleteProfile(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await profileService.updateProfile(id, { name: editName.trim() });
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p)));
    setEditingId(null);
  };

  const handleShuffleAvatar = async (id: string) => {
    const seed = nanoid();
    await profileService.updateProfile(id, { avatarSeed: seed });
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, avatarSeed: seed } : p)));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-12 px-8 py-16 w-full max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">Who&apos;s watching?</h1>

        <div className="flex flex-wrap justify-center gap-8">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex flex-col items-center gap-3 w-28">
              <button
                type="button"
                onClick={() => handleSelect(profile.id)}
                className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Select profile ${profile.name}`}
              >
                <AvatarCircle seed={profile.avatarSeed} size={80} />
                {!managing && (
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>

              {managing && editingId === profile.id ? (
                <div className="flex flex-col items-center gap-1 w-full">
                  <input
                    className="w-full text-center bg-muted text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveEdit(profile.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit(profile.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <span className="text-sm text-center text-muted-foreground">{profile.name}</span>
              )}

              {managing && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    title="Rename"
                    onClick={() => {
                      setEditingId(profile.id);
                      setEditName(profile.name);
                    }}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    title="Shuffle avatar"
                    onClick={() => void handleShuffleAvatar(profile.id)}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete profile"
                    onClick={() => void handleDelete(profile.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {!showAdd ? (
            <div className="flex flex-col items-center gap-3 w-28">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Add profile"
              >
                <Plus size={28} />
              </button>
              <span className="text-sm text-center text-muted-foreground">Add Profile</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-40 bg-card border border-border rounded-2xl p-4">
              <div className="relative">
                <AvatarCircle seed={newSeed} size={72} />
                <button
                  type="button"
                  title="Shuffle avatar"
                  onClick={() => setNewSeed(nanoid())}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
              <input
                ref={newNameRef}
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") setShowAdd(false);
                }}
                className="w-full text-center bg-muted text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={creating || !newName.trim()}
                  onClick={() => void handleCreate()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setManaging((m) => !m)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-accent"
        >
          {managing ? "Done" : "Manage Profiles"}
        </button>
      </div>
    </div>
  );
}
