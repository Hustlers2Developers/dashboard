import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { SUBMIT_GUEST_APPLICATION } from "@/graphql/mutations/guest-applications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

const Apply = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    githubUsername: "",
    portfolioUrl: "",
    reason: "",
  });

  const [submitApplication, { loading }] = useMutation(SUBMIT_GUEST_APPLICATION);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    if (!form.email.trim() || !form.email.includes("@")) { toast.error("Valid email is required."); return; }
    if (!form.reason.trim()) { toast.error("Please tell us why you want to join."); return; }

    try {
      await submitApplication({
        variables: {
          input: {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phoneNumber: form.phoneNumber.trim() || undefined,
            githubUsername: form.githubUsername.trim() || undefined,
            portfolioUrl: form.portfolioUrl.trim() || undefined,
            reason: form.reason.trim(),
          },
        },
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application.");
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border text-center">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <CheckCircle className="h-14 w-14 text-emerald-500" />
            <h2 className="text-xl font-bold text-foreground">Application submitted!</h2>
            <p className="text-sm text-muted-foreground">
              We'll review your application and send you an invite link by email if approved.
            </p>
            <Button variant="outline" onClick={() => navigate("/login")}>Back to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl gold-gradient">
            <span className="text-lg font-bold text-primary-foreground">G</span>
          </div>
          <CardTitle>Apply to Join</CardTitle>
          <CardDescription>
            Fill out this form to request access. Our team will review and send you an invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="+91-9876543210" />
              </div>
              <div className="space-y-2">
                <Label>GitHub Username</Label>
                <Input name="githubUsername" value={form.githubUsername} onChange={handleChange} placeholder="yourusername" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Portfolio URL</Label>
              <Input name="portfolioUrl" value={form.portfolioUrl} onChange={handleChange} placeholder="https://yoursite.dev" />
            </div>

            <div className="space-y-2">
              <Label>Why do you want to join? *</Label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={4}
                placeholder="Tell us about yourself and your motivation..."
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" className="underline hover:text-foreground" onClick={() => navigate("/login")}>
                Log in
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Apply;
