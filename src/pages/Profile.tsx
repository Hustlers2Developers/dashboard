import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MY_PROFILE, UPDATE_PROFILE } from "@/graphql/mutations/users";
import { LINK_TELEGRAM_ACCOUNT, UNLINK_TELEGRAM_ACCOUNT } from "@/graphql/mutations/telegram";
import { TelegramLoginWidget, type TelegramAuthPayload } from "@/components/TelegramLoginWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  User,
  Github,
  Linkedin,
  Globe,
  Phone,
  MapPin,
  Briefcase,
  Instagram,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
  Server,
  Smartphone,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

type TechStack = "FRONTEND" | "BACKEND" | "MOBILE" | "DATA" | "FULLSTACK";

const TECH_STACK_OPTIONS: Array<{ value: TechStack; label: string; icon: typeof Code2 }> = [
  { value: "FRONTEND", label: "Frontend", icon: Code2 },
  { value: "BACKEND", label: "Backend", icon: Server },
  { value: "MOBILE", label: "Mobile", icon: Smartphone },
  { value: "DATA", label: "Data", icon: Database },
  { value: "FULLSTACK", label: "Fullstack", icon: Layers },
];

type UserDetails = {
  phoneNumber?: string | null;
  bio?: string | null;
  title?: string | null;
  dob?: string | null;
  address?: string | null;
  profilePicUrl?: string | null;
  avatarUrl?: string | null;
  githubUsername?: string | null;
  linkedInUrl?: string | null;
  leetcodeUsername?: string | null;
  gfgUsername?: string | null;
  instagramUrl?: string | null;
  portfolioUrl?: string | null;
  primaryTechStack?: TechStack | null;
  isPublic?: boolean;
};

type ProfileData = {
  id: string;
  name: string;
  email: string;
  systemRole: string;
  createdAt: string;
  telegramUserId?: string | null;
  telegramUsername?: string | null;
  details?: UserDetails | null;
};

// View-mode link chip — shows only an icon + platform name, never the raw
// URL/username, and is directly clickable (opens in a new tab). The actual
// value is only ever visible again once the user clicks Edit and it becomes
// a plain text Input.
const LinkPill = ({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
  </a>
);

const withProtocol = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const initials = (name?: string | null, email?: string) => {
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

const Profile = () => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ myProfile: ProfileData }>(MY_PROFILE, {
    fetchPolicy: "cache-first",
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [linkTelegramAccount] = useMutation(LINK_TELEGRAM_ACCOUNT);
  const [unlinkTelegramAccount] = useMutation(UNLINK_TELEGRAM_ACCOUNT);

  const profile = data?.myProfile;

  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    title: "",
    phoneNumber: "",
    address: "",
    dob: "",
    githubUsername: "",
    linkedInUrl: "",
    leetcodeUsername: "",
    gfgUsername: "",
    instagramUrl: "",
    portfolioUrl: "",
    profilePicUrl: "",
    primaryTechStack: "" as TechStack | "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        bio: profile.details?.bio || "",
        title: profile.details?.title || "",
        phoneNumber: profile.details?.phoneNumber || "",
        address: profile.details?.address || "",
        dob: profile.details?.dob ? profile.details.dob.split("T")[0] : "",
        githubUsername: profile.details?.githubUsername || "",
        linkedInUrl: profile.details?.linkedInUrl || "",
        leetcodeUsername: profile.details?.leetcodeUsername || "",
        gfgUsername: profile.details?.gfgUsername || "",
        instagramUrl: profile.details?.instagramUrl || "",
        portfolioUrl: profile.details?.portfolioUrl || "",
        profilePicUrl: profile.details?.profilePicUrl || "",
        primaryTechStack: profile.details?.primaryTechStack || "",
      });
      setAvatarError(false);
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Single GraphQL mutation covers the User record (name) and all
      // UserDetails fields — no separate REST call needed.
      await updateProfile({
        variables: {
          input: {
            name: form.name || undefined,
            bio: form.bio || undefined,
            title: form.title || undefined,
            phoneNumber: form.phoneNumber || undefined,
            address: form.address || undefined,
            dob: form.dob || undefined,
            profilePicUrl: form.profilePicUrl || undefined,
            githubUsername: form.githubUsername || undefined,
            linkedInUrl: form.linkedInUrl || undefined,
            leetcodeUsername: form.leetcodeUsername || undefined,
            gfgUsername: form.gfgUsername || undefined,
            instagramUrl: form.instagramUrl || undefined,
            portfolioUrl: form.portfolioUrl || undefined,
            primaryTechStack: form.primaryTechStack || undefined,
          },
        },
      });

      toast.success("Profile updated successfully.");
      setEditing(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  // Saves immediately on toggle — this is a settings switch, not part of the
  // Edit/Save profile-details form.
  const handleToggleVisibility = async (next: boolean) => {
    setSavingVisibility(true);
    try {
      await updateProfile({ variables: { input: { isPublic: next } } });
      toast.success(next ? "Your profile is now public." : "Your profile is now private.");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update visibility.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleTelegramAuth = async (payload: TelegramAuthPayload) => {
    setLinkingTelegram(true);
    try {
      await linkTelegramAccount({ variables: { input: payload } });
      await refetch();
      toast.success("Telegram account linked. Your channel join requests will be auto-approved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link Telegram account.");
    } finally {
      setLinkingTelegram(false);
    }
  };

  const handleTelegramUnlink = async () => {
    setUnlinkingTelegram(true);
    try {
      await unlinkTelegramAccount();
      await refetch();
      toast.success("Telegram account unlinked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlink Telegram account.");
    } finally {
      setUnlinkingTelegram(false);
    }
  };

  const formatDate = (val?: string | null) => {
    if (!val) return "—";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
            <p className="text-muted-foreground">View and update your personal details.</p>
          </div>
        </div>

        {loading ? (
          <Card className="border-border">
            <CardContent className="space-y-4 p-6">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-border">
            <CardContent className="p-6">
              <p className="text-destructive">{error.message}</p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {profile && (
              <Card className="border-border">
                <CardContent className="flex items-center gap-4 p-6">
                  {profile.details?.profilePicUrl && !avatarError ? (
                    <img
                      src={profile.details.profilePicUrl}
                      alt={profile.name || profile.email}
                      onError={() => setAvatarError(true)}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                      {initials(profile.name, profile.email)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{profile.name || "Unnamed user"}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {profile?.details?.isPublic !== false ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile visibility</p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.details?.isPublic !== false
                        ? "Your bio, title, and links are visible to other members in Community."
                        : "Your bio, title, and links are hidden from other members."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={profile?.details?.isPublic !== false}
                  onCheckedChange={handleToggleVisibility}
                  disabled={savingVisibility}
                />
              </CardContent>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Your name and email are always visible in Community regardless of this setting.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Telegram</p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.telegramUserId
                        ? `Linked as @${profile.telegramUsername || profile.telegramUserId}. Your join requests on the org channel are auto-approved.`
                        : "Link your Telegram account so channel join requests are auto-approved."}
                    </p>
                  </div>
                </div>
                {profile?.telegramUserId && (
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    loading={unlinkingTelegram}
                    loadingText="Unlinking..."
                    onClick={handleTelegramUnlink}
                  >
                    Unlink
                  </LoadingButton>
                )}
              </CardContent>
              {!profile?.telegramUserId && (
                <CardContent className="pt-0">
                  {TELEGRAM_BOT_USERNAME ? (
                    <TelegramLoginWidget
                      botUsername={TELEGRAM_BOT_USERNAME}
                      onAuth={handleTelegramAuth}
                      disabled={linkingTelegram}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Telegram login isn't configured for this deployment yet.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>

          <form onSubmit={handleSave}>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Personal Info</CardTitle>
                {!editing ? (
                  <Button type="button" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                    <LoadingButton type="submit" className="gold-gradient text-primary-foreground" loading={saving} loadingText="Saving...">
                      Save
                    </LoadingButton>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    {editing ? (
                      <Input name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
                    ) : (
                      <p className="text-sm text-foreground">{profile?.name || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {profile?.email ? (
                      <a
                        href={`mailto:${profile.email}`}
                        className="text-sm text-accent hover:underline break-all"
                      >
                        {profile.email}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label><Briefcase className="mr-1 inline h-3.5 w-3.5" />Job Title</Label>
                    {editing ? (
                      <Input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Senior Engineer" />
                    ) : (
                      <p className="text-sm text-foreground">{profile?.details?.title || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label><Phone className="mr-1 inline h-3.5 w-3.5" />Phone</Label>
                    {editing ? (
                      <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="+91-9876543210" />
                    ) : (
                      <p className="text-sm text-foreground">{profile?.details?.phoneNumber || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    {editing ? (
                      <Input name="dob" type="date" value={form.dob} onChange={handleChange} />
                    ) : (
                      <p className="text-sm text-foreground">{formatDate(profile?.details?.dob)}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label><MapPin className="mr-1 inline h-3.5 w-3.5" />Address</Label>
                    {editing ? (
                      <Input name="address" value={form.address} onChange={handleChange} placeholder="City, Country" />
                    ) : (
                      <p className="text-sm text-foreground">{profile?.details?.address || "—"}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bio</Label>
                  {editing ? (
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <p className="text-sm text-foreground">{profile?.details?.bio || "—"}</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label><Sparkles className="mr-1 inline h-3.5 w-3.5" />Primary tech stack</Label>
                  {editing ? (
                    <>
                      <Select
                        value={form.primaryTechStack}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, primaryTechStack: v as TechStack }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your primary tech stack" />
                        </SelectTrigger>
                        <SelectContent>
                          {TECH_STACK_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Used to auto-assign you to your org's tech-stack team. Your own choice — not
                        derived from your GitHub activity.
                      </p>
                    </>
                  ) : profile?.details?.primaryTechStack ? (
                    (() => {
                      const opt = TECH_STACK_OPTIONS.find((o) => o.value === profile.details?.primaryTechStack);
                      const Icon = opt?.icon ?? Sparkles;
                      return (
                        <p className="flex items-center gap-1.5 text-sm text-foreground">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          {opt?.label ?? profile.details.primaryTechStack}
                        </p>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">Not set — click Edit to choose one.</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Links</p>

                  {editing ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label><Github className="mr-1 inline h-3.5 w-3.5" />GitHub Username</Label>
                        <Input name="githubUsername" value={form.githubUsername} onChange={handleChange} placeholder="alicejohnson" />
                      </div>
                      <div className="space-y-2">
                        <Label><Linkedin className="mr-1 inline h-3.5 w-3.5" />LinkedIn URL</Label>
                        <Input name="linkedInUrl" value={form.linkedInUrl} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                      </div>
                      <div className="space-y-2">
                        <Label><Globe className="mr-1 inline h-3.5 w-3.5" />Portfolio URL</Label>
                        <Input name="portfolioUrl" value={form.portfolioUrl} onChange={handleChange} placeholder="https://yoursite.dev" />
                      </div>
                      <div className="space-y-2">
                        <Label>Profile Picture URL</Label>
                        <Input name="profilePicUrl" value={form.profilePicUrl} onChange={handleChange} placeholder="https://cdn.example.com/photo.jpg" />
                      </div>
                      <div className="space-y-2">
                        <Label>LeetCode Username</Label>
                        <Input name="leetcodeUsername" value={form.leetcodeUsername} onChange={handleChange} placeholder="alice_lc" />
                      </div>
                      <div className="space-y-2">
                        <Label>GeeksforGeeks Username</Label>
                        <Input name="gfgUsername" value={form.gfgUsername} onChange={handleChange} placeholder="alice_gfg" />
                      </div>
                      <div className="space-y-2">
                        <Label>Instagram URL</Label>
                        <Input name="instagramUrl" value={form.instagramUrl} onChange={handleChange} placeholder="https://instagram.com/..." />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Compact clickable chips — never show the raw URL/username here,
                          only when Edit is clicked does the real value appear (as an input). */}
                      <div className="flex flex-wrap gap-2">
                        {profile?.details?.githubUsername && (
                          <LinkPill
                            icon={Github}
                            label="GitHub"
                            href={`https://github.com/${profile.details.githubUsername}`}
                          />
                        )}
                        {profile?.details?.linkedInUrl && (
                          <LinkPill
                            icon={Linkedin}
                            label="LinkedIn"
                            href={withProtocol(profile.details.linkedInUrl)}
                          />
                        )}
                        {profile?.details?.portfolioUrl && (
                          <LinkPill
                            icon={Globe}
                            label="Portfolio"
                            href={withProtocol(profile.details.portfolioUrl)}
                          />
                        )}
                        {profile?.details?.leetcodeUsername && (
                          <LinkPill
                            icon={Code2}
                            label="LeetCode"
                            href={`https://leetcode.com/${profile.details.leetcodeUsername}`}
                          />
                        )}
                        {profile?.details?.gfgUsername && (
                          <LinkPill
                            icon={Code2}
                            label="GeeksforGeeks"
                            href={`https://www.geeksforgeeks.org/user/${profile.details.gfgUsername}`}
                          />
                        )}
                        {profile?.details?.instagramUrl && (
                          <LinkPill
                            icon={Instagram}
                            label="Instagram"
                            href={withProtocol(profile.details.instagramUrl)}
                          />
                        )}
                        {!profile?.details?.githubUsername &&
                          !profile?.details?.linkedInUrl &&
                          !profile?.details?.portfolioUrl &&
                          !profile?.details?.leetcodeUsername &&
                          !profile?.details?.gfgUsername &&
                          !profile?.details?.instagramUrl && (
                            <p className="text-sm text-muted-foreground">
                              No links added yet — click Edit to add some.
                            </p>
                          )}
                      </div>

                      {profile?.details?.profilePicUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          {!avatarError && (
                            <img
                              src={profile.details.profilePicUrl}
                              alt="Profile"
                              className="h-6 w-6 shrink-0 rounded-full border border-border object-cover"
                              onError={() => setAvatarError(true)}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="text-xs text-muted-foreground">Profile picture set</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
