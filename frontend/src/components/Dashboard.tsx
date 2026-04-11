import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userContext } from "../Context/userContext";
import connect from "../axios/connect";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  BookOpen,
  Plus,
  Search,
  GitPullRequest,
  CircleDot,
  Bell,
  Eye,
  Lock,
  Globe,
  Loader2,
  Inbox,
  ArrowRight,
  Sparkles,
} from "lucide-react";

dayjs.extend(relativeTime);

/* ── Types ── */
interface Repo {
  name: string;
  description: string;
  visibility: string;
  slug: string;
  my_role: string | null;
}

interface Notification {
  id: number;
  actor_name: string;
  verb: string;
  content_object: {
    id: number;
    type: string;
    name: string;
  } | null;
  is_read: boolean;
  created_at: string;
}

/* ── Helpers ── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function visibilityIcon(v: string) {
  return v === "public" ? (
    <Globe className="w-3.5 h-3.5 text-green-500" />
  ) : (
    <Lock className="w-3.5 h-3.5 text-yellow-500" />
  );
}

function notifIcon(type: string | undefined) {
  switch (type) {
    case "PullRequest":
      return <GitPullRequest className="w-4 h-4 text-purple-500" />;
    case "Issue":
      return <CircleDot className="w-4 h-4 text-green-500" />;
    default:
      return <Bell className="w-4 h-4 text-blue-500" />;
  }
}

/* ─────────────────────── Component ─────────────────────── */

const Dashboard = () => {
  const { login, isLoading: userLoading } = useContext(userContext);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!login) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [repoRes, notifRes] = await Promise.all([
          connect.get("/repositories/"),
          connect.get("/notifications/"),
        ]);
        setRepos(repoRes.data.results ?? repoRes.data);
        setNotifications(notifRes.data.results ?? notifRes.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [login]);

  /* ── Not logged in — show a landing-style hero ── */
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!login) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <Sparkles className="w-12 h-12 text-blue-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to CollabHub
        </h1>
        <p className="text-gray-500 max-w-md mb-6">
          A developer collaboration platform for version control, code review,
          issue tracking, and more. Sign in to get started.
        </p>
      </div>
    );
  }

  /* ── Filtered repos ── */
  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Greeting ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {login.first_name || login.email}
            </span>
            👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's what's happening across your repositories.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-6">
          {/* ════════════════ LEFT SIDEBAR — Repositories ════════════════ */}
          <aside>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  Top Repositories
                </h2>
                <Link
                  to="/new"
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                  title="New repository"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    className="bg-transparent outline-none text-sm w-full placeholder:text-gray-400"
                    placeholder="Find a repository…"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Repo list */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                {loading ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    Loading…
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    {repoSearch ? "No matching repositories." : "No repositories yet."}
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <Link
                      key={repo.slug}
                      to={`/${repo.slug}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="mt-0.5">{visibilityIcon(repo.visibility)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                          {repo.name}
                        </p>
                        {repo.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              repo.visibility === "public"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {repo.visibility}
                          </span>
                          {repo.my_role && (
                            <span className="text-[10px] text-gray-400">
                              {repo.my_role}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <Link
                  to="/new"
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg py-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New repository
                </Link>
              </div>
            </div>
          </aside>

          {/* ════════════════ CENTER — Recent Activity ════════════════ */}
          <main>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-500" />
                  Recent Activity
                  {unreadCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h2>
              </div>

              <div className="divide-y divide-gray-50">
                {loading ? (
                  <div className="px-5 py-10 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading activity…</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No recent activity.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Activity from your repositories will show up here.
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
                        notif.is_read
                          ? "hover:bg-gray-50"
                          : "bg-blue-50/40 hover:bg-blue-50"
                      }`}
                    >
                      {/* Icon */}
                      <div className="mt-0.5 shrink-0">
                        {notifIcon(notif.content_object?.type)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">
                            {notif.actor_name || "Someone"}
                          </span>{" "}
                          {notif.verb}
                        </p>

                        {notif.content_object && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {notif.content_object.name}
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                          {dayjs(notif.created_at).fromNow()}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>

          {/* ════════════════ RIGHT SIDEBAR — Quick Actions + Stats ════════════════ */}
          <aside className="space-y-5">
            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Quick Actions
                </h2>
              </div>

              <div className="p-4 space-y-2">
                <Link
                  to="/new"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Plus className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">New repository</p>
                    <p className="text-xs text-gray-400">Create a new project</p>
                  </div>
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Your profile</p>
                    <p className="text-xs text-gray-400">View your repositories</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Repository Stats */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Overview
                </h2>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{repos.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Repositories</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {repos.filter((r) => r.visibility === "public").length}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Public</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {repos.filter((r) => r.visibility === "private").length}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Private</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600 font-bold">
                    {unreadCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Unread</p>
                </div>
              </div>
            </div>

            {/* Explore */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Explore your projects
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Navigate to any repository to manage branches, pull requests,
                and issues.
              </p>
              <Link
                to="/profile?tab=repositories"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all repos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
