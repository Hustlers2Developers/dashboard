import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthStore } from "@/stores/auth-store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MY_PROFILE, UPDATE_PROFILE } from "@/graphql/mutations/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Github, Linkedin, Globe, Phone, MapPin, Briefcase } from "lucide-react";

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL as string || 'https://api.godevelopers.online/graphql';
const REST_BASE = GRAPHQL_URL.replace('/graphql', '');

type UserDetails = {
  phoneNumber?: string | null;
  bio?: string | null;
  title?: string | null;
  dob?: string | null;
  address?: string | null;
  profilePicUrl?: string | null;
  githubUsername?: string | null;
  linkedInUrl?: string | null;
  portfolioUrl?: string | null;
};

type ProfileData = {
  id: string;
  name: string;
  email: string;
  systemRole: string;
  createdAt: string;
  details?: UserDetails | null;
};

const Profile = () => {
  const { accessToken } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ myProfile: ProfileData }>(MY_PROFILE, {
    fetchPolicy: "cache-and-network",
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const profile = data?.myProfile;

  const [form, setForm] = useState({
    name: "",
    bio: "",
    title: "",
    phoneNumber: "",
    address: "",
    dob: "",
    githubUsername: "",
    linkedInUrl: "",
    portfolioUrl: "",
    profilePicUrl: "",
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
        portfolioUrl: profile.details?.portfolioUrl || "",
        profilePicUrl: profile.details?.profilePicUrl || "",
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // GraphQL updateProfile for name + social links
      await updateProfile({
        variables: {
          input: {
            name: form.name || undefined,
            bio: form.bio || undefined,
            title: form.title || undefined,
            githubUsername: form.githubUsername || undefined,
            linkedInUrl: form.linkedInUrl || undefined,
            portfolioUrl: form.portfolioUrl || undefined,
          },
        },
      });

      // REST PATCH for additional user details
      const res = await fetch(`${REST_BASE}/users/me/details`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.name || undefined,
          phoneNumber: form.phoneNumber || undefined,
          bio: form.bio || undefined,
          title: form.title || undefined,
          dob: form.dob || undefined,
          address: form.address || undefined,
          profilePicUrl: form.profilePicUrl || undefined,
          githubUsername: form.githubUsername || undefined,
          linkedInUrl: form.linkedInUrl || undefined,
          portfolioUrl: form.portfolioUrl || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Failed to update profile");
      }

      toast.success("Profile updated successfully.");
      setEditing(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
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
          <form onSubmit={handleSave}>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Personal Info</CardTitle>
                {!editing ? (
                  <Button type="button" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                    <Button type="submit" className="gold-gradient text-primary-foreground" disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
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
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
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

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Links</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label><Github className="mr-1 inline h-3.5 w-3.5" />GitHub Username</Label>
                      {editing ? (
                        <Input name="githubUsername" value={form.githubUsername} onChange={handleChange} placeholder="alicejohnson" />
                      ) : (
                        <p className="text-sm text-foreground">{profile?.details?.githubUsername || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label><Linkedin className="mr-1 inline h-3.5 w-3.5" />LinkedIn URL</Label>
                      {editing ? (
                        <Input name="linkedInUrl" value={form.linkedInUrl} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                      ) : (
                        <p className="text-sm text-foreground">{profile?.details?.linkedInUrl || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label><Globe className="mr-1 inline h-3.5 w-3.5" />Portfolio URL</Label>
                      {editing ? (
                        <Input name="portfolioUrl" value={form.portfolioUrl} onChange={handleChange} placeholder="https://yoursite.dev" />
                      ) : (
                        <p className="text-sm text-foreground">{profile?.details?.portfolioUrl || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Profile Picture URL</Label>
                      {editing ? (
                        <Input name="profilePicUrl" value={form.profilePicUrl} onChange={handleChange} placeholder="https://cdn.example.com/photo.jpg" />
                      ) : (
                        <p className="text-sm text-foreground">{profile?.details?.profilePicUrl || "—"}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
