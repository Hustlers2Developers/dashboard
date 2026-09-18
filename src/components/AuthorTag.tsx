import { useState } from "react";

export type CommunityUserDetails = {
  title?: string | null;
  bio?: string | null;
  profilePicUrl?: string | null;
  githubUsername?: string | null;
  linkedInUrl?: string | null;
  isPublic?: boolean;
};

export type CommunityUser = {
  id: string;
  email: string;
  name?: string | null;
  systemRole: string;
  createdAt: string;
  details?: CommunityUserDetails | null;
};

export const initials = (name?: string | null, email?: string) => {
  const base = name?.trim() || email || "";
  return (
    base
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
};

// Deterministic accent color per person, purely cosmetic — keeps avatar
// initials from looking identical across a whole list.
const AVATAR_COLORS = [
  "bg-primary/10 text-primary",
  "bg-accent/15 text-accent",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
];
export const colorFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/** Small inline "posted by" tag — avatar/initials + name, with a fallback
 * for an authorId that isn't (yet, or no longer) in the org member list. */
export const AuthorTag = ({ author, authorId }: { author?: CommunityUser; authorId: string }) => {
  const [errored, setErrored] = useState(false);
  const displayName = author?.name || author?.email || "Unknown member";
  const picUrl = author?.details?.profilePicUrl;

  return (
    <span className="flex items-center gap-1.5">
      {picUrl && !errored ? (
        <img
          src={picUrl}
          alt={displayName}
          onError={() => setErrored(true)}
          referrerPolicy="no-referrer"
          className="h-4 w-4 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold ${colorFor(author?.id ?? authorId)}`}
        >
          {initials(author?.name, author?.email)}
        </span>
      )}
      <span className="max-w-[10rem] truncate text-foreground/90">{displayName}</span>
    </span>
  );
};
