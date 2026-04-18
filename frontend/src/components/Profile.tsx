import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  CircleDot,
  FolderGit2,
  GitPullRequest,
  Loader2,
  Mail,
  Pencil,
} from "lucide-react";
import connect from "../axios/connect";
import { userContext } from "../Context/userContext";
import { fetchAllPages } from "../lib/pagination";
import { errorToast } from "../lib/toast";
import type { NotificationItem } from "./dashboard/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProfileTab = "overview" | "repositories" | "pull_requests" | "issues" | "activity";

interface ProfileSummaryResponse {
  user: {
    pk: number;
    email: string;
    first_name: string;
    last_name: string;
    bio: string;
    created_at: string;
  };
  stats: {
    repositories: number;
    public_repositories: number;
    private_repositories: number;
    open_pull_requests: number;
    active_issues: number;
    unread_notifications: number;
  };
}

interface ProfileRepo {
  name: string;
  description: string;
  visibility: string;
  slug: string;
  my_role: string | null;
}

interface PullRequestSummaryItem {
  id: number;
  title: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  created_at: string;
  source_name: string;
  target_name: string;
}

interface IssueSummaryItem {
  id: number;
  title: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
}

interface RepoPullRequest extends PullRequestSummaryItem {
  repo_name: string;
  repo_slug: string;
}

interface RepoIssue extends IssueSummaryItem {
  repo_name: string;
  repo_slug: string;
}

function statusPillClass(status: string) {
  if (status === "OPEN" || status === "open") {
    return "bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20";
  }
  if (status === "CLOSED" || status === "closed") {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-500 border border-purple-500/20";
  }
  if (status === "MERGED") {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-500 border border-purple-500/20";
  }
  return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20";
}

function prettyRole(role: string | null) {
  if (!role) {
    return "viewer";
  }
  return role.replace("_", " ");
}

const Profile = () => {
  const { login, refreshUser } = useContext(userContext);

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [summary, setSummary] = useState<ProfileSummaryResponse | null>(null);
  const [repos, setRepos] = useState<ProfileRepo[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [pullRequests, setPullRequests] = useState<RepoPullRequest[] | null>(null);
  const [issues, setIssues] = useState<RepoIssue[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  const fetchBaseData = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);

    try {
      const [summaryResponse, repoList] = await Promise.all([
        connect.get<ProfileSummaryResponse>("/accounts/profile-summary/"),
        fetchAllPages<ProfileRepo>(connect, "/repositories/"),
      ]);

      setSummary(summaryResponse.data);
      setRepos(repoList);
    } catch (error) {
      errorToast(error, "Failed to load profile.");
      setError("Failed to load profile.");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadPullRequests = useCallback(async () => {
    if (pullRequests !== null) {
      return;
    }

    setLoadingTabData(true);
    try {
      const memberRepos = repos.filter((repo) => Boolean(repo.my_role));
      const perRepo = await Promise.all(
        memberRepos.map(async (repo) => {
          try {
            const list = await fetchAllPages<PullRequestSummaryItem>(
              connect,
              `/repositories/${repo.slug}/pull-requests/`
            );
            return list.map((item) => ({
              ...item,
              repo_name: repo.name,
              repo_slug: repo.slug,
            }));
          } catch {
            return [];
          }
        })
      );

      setPullRequests(perRepo.flat());
    } finally {
      setLoadingTabData(false);
    }
  }, [pullRequests, repos]);

  const loadIssues = useCallback(async () => {
    if (issues !== null) {
      return;
    }

    setLoadingTabData(true);
    try {
      const memberRepos = repos.filter((repo) => Boolean(repo.my_role));
      const perRepo = await Promise.all(
        memberRepos.map(async (repo) => {
          try {
            const list = await fetchAllPages<IssueSummaryItem>(
              connect,
              `/repositories/${repo.slug}/issues/`
            );
            return list.map((item) => ({
              ...item,
              repo_name: repo.name,
              repo_slug: repo.slug,
            }));
          } catch {
            return [];
          }
        })
      );

      setIssues(perRepo.flat());
    } finally {
      setLoadingTabData(false);
    }
  }, [issues, repos]);

  const loadActivity = useCallback(async () => {
    if (notifications !== null) {
      return;
    }

    setLoadingTabData(true);
    try {
      const list = await fetchAllPages<NotificationItem>(connect, "/notifications/");
      setNotifications(list);
    } finally {
      setLoadingTabData(false);
    }
  }, [notifications]);

  useEffect(() => {
    if (!login) {
      return;
    }
    void fetchBaseData();
  }, [fetchBaseData, login]);

  useEffect(() => {
    if (activeTab === "pull_requests") {
      void loadPullRequests();
    } else if (activeTab === "issues") {
      void loadIssues();
    } else if (activeTab === "activity") {
      void loadActivity();
    }
  }, [activeTab, loadActivity, loadIssues, loadPullRequests]);

  const profileUser = summary?.user ?? null;
  const profileStats = summary?.stats;

  const displayName = useMemo(() => {
    if (!profileUser) {
      return "";
    }
    return `${profileUser.first_name} ${profileUser.last_name}`.trim() || profileUser.email;
  }, [profileUser]);

  const handle = useMemo(() => {
    const source = profileUser?.email ?? login?.email ?? "";
    return source.split("@")[0] || "developer";
  }, [login?.email, profileUser?.email]);

  const initials = useMemo(() => {
    if (profileUser?.first_name) {
      return profileUser.first_name[0]!.toUpperCase();
    }
    if (profileUser?.email) {
      return profileUser.email[0]!.toUpperCase();
    }
    return "U";
  }, [profileUser?.email, profileUser?.first_name]);

  const openEditDialog = () => {
    if (!profileUser) {
      return;
    }
    setFirstName(profileUser.first_name ?? "");
    setLastName(profileUser.last_name ?? "");
    setEmail(profileUser.email ?? "");
    setBio(profileUser.bio ?? "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      await connect.patch("/accounts/register/", {
        first_name: firstName,
        last_name: lastName,
        email,
        bio,
      });
      await Promise.all([fetchBaseData(), refreshUser()]);
      setEditOpen(false);
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!login) {
    return null;
  }

  if (loadingSummary) {
    return (
      <div className="min-h-screen bg-muted/30 text-foreground flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-screen bg-muted/30 text-foreground flex items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-40 h-40 shrink-0 rounded-2xl bg-muted border border-border flex items-center justify-center text-5xl font-semibold relative text-foreground">
              {initials}
              <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-green-500 border-4 border-card" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{displayName}</h1>
                <Button
                  className="bg-card border border-border text-foreground hover:bg-accent"
                  onClick={openEditDialog}
                  variant="outline"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              <p className="text-2xl mt-1 text-muted-foreground">@{handle}</p>

              <p className="mt-4 text-2xl leading-relaxed text-foreground">
                {profileUser?.bio || "No bio added yet."}
              </p>

              <div className="mt-5 flex flex-wrap gap-5 text-muted-foreground text-sm">
                <span className="inline-flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {profileUser?.email}
                </span>
                {profileUser?.created_at && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Joined {dayjs(profileUser.created_at).format("MMM YYYY")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <p className="text-4xl font-semibold">{profileStats?.repositories ?? repos.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Repositories</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <p className="text-4xl font-semibold">{profileStats?.open_pull_requests ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Open pull requests</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <p className="text-4xl font-semibold">{profileStats?.active_issues ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Active issues</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
            <p className="text-4xl font-semibold">{profileStats?.unread_notifications ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Unread notifications</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <nav className="px-4 md:px-6 border-b border-border">
            <div className="flex flex-wrap gap-5 text-base">
              {[
                { id: "overview", label: "Overview", icon: BookOpen },
                { id: "repositories", label: "Repositories", icon: FolderGit2, count: repos.length },
                { id: "pull_requests", label: "Pull Requests", icon: GitPullRequest, count: profileStats?.open_pull_requests ?? 0 },
                { id: "issues", label: "Issues", icon: CircleDot, count: profileStats?.active_issues ?? 0 },
                { id: "activity", label: "Activity", icon: Activity, count: profileStats?.unread_notifications ?? 0 },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    className={`inline-flex items-center gap-2 py-4 border-b-2 transition-colors ${
                      active
                        ? "border-primary text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ProfileTab)}
                    type="button"
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {typeof tab.count === "number" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 md:p-6">
            {loadingTabData && (
              <div className="inline-flex items-center gap-2 text-sm text-[#57606a]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading data...
              </div>
            )}

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-muted/50 p-5">
                  <h3 className="text-lg font-semibold">About</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {profileUser?.bio || "No bio available."}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-5">
                  <h3 className="text-lg font-semibold">Workspace snapshot</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>Public repositories: {profileStats?.public_repositories ?? 0}</li>
                    <li>Private repositories: {profileStats?.private_repositories ?? 0}</li>
                    <li>Open pull requests: {profileStats?.open_pull_requests ?? 0}</li>
                    <li>Active issues: {profileStats?.active_issues ?? 0}</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "repositories" && (
              <div className="space-y-3">
                {repos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No repositories found.</p>
                ) : (
                  repos.map((repo) => (
                    <div
                      className="rounded-xl border border-border bg-muted/50 p-4 flex items-start justify-between gap-4"
                      key={repo.slug}
                    >
                      <div className="min-w-0">
                        <Link
                          className="text-primary hover:underline font-semibold"
                          to={`/${repo.slug}`}
                        >
                          {repo.name}
                        </Link>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{repo.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs px-2 py-1 rounded-full bg-card text-muted-foreground border border-border capitalize">
                          {repo.visibility}
                        </p>
                        {repo.my_role && (
                          <p className="text-xs text-muted-foreground mt-2 capitalize">
                            {prettyRole(repo.my_role)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "pull_requests" && (
              <div className="space-y-3">
                {(pullRequests ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pull requests available.</p>
                ) : (
                  pullRequests!.map((item) => (
                    <div className="rounded-xl border border-border bg-muted/50 p-4" key={`${item.repo_slug}-${item.id}`}>
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          className="text-primary hover:underline font-medium"
                          to={`/${item.repo_slug}/pullrequests/${item.id}`}
                        >
                          {item.title}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusPillClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.repo_name} · {item.source_name} to {item.target_name} ·{" "}
                        {dayjs(item.created_at).fromNow()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "issues" && (
              <div className="space-y-3">
                {(issues ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issues available.</p>
                ) : (
                  issues!.map((item) => (
                    <div className="rounded-xl border border-border bg-muted/50 p-4" key={`${item.repo_slug}-${item.id}`}>
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          className="text-primary hover:underline font-medium"
                          to={`/${item.repo_slug}/issues/${item.id}`}
                        >
                          {item.title}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusPillClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.repo_name} · updated {dayjs(item.updated_at).fromNow()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-3">
                {(notifications ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity to show.</p>
                ) : (
                  notifications!.slice(0, 30).map((notification) => (
                    <div
                      className="rounded-xl border border-border bg-muted/50 p-4 flex items-start justify-between gap-4"
                      key={notification.id}
                    >
                      <div>
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{notification.actor_name || "Someone"}</span>{" "}
                          {notification.verb}
                        </p>
                        {notification.content_object?.name && (
                          <p className="text-xs text-muted-foreground mt-1">{notification.content_object.name}</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-2">
                        {!notification.is_read && <Bell className="w-3.5 h-3.5 text-primary" />}
                        {dayjs(notification.created_at).fromNow()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog onOpenChange={setEditOpen} open={editOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">First name</label>
              <Input onChange={(e) => setFirstName(e.target.value)} value={firstName} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Last name</label>
              <Input onChange={(e) => setLastName(e.target.value)} value={lastName} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <Input onChange={(e) => setEmail(e.target.value)} type="email" value={email} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Bio</label>
              <Textarea onChange={(e) => setBio(e.target.value)} rows={4} value={bio} />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={saving} onClick={() => setEditOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={saving || !email.trim()} onClick={saveProfile}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
