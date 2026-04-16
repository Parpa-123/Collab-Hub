import { useContext, useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, Loader2 } from "lucide-react";
import { userContext } from "../Context/userContext";
import connect from "../axios/connect";
import { fetchAllPages } from "../lib/pagination";
import ActivityPanel from "./dashboard/ActivityPanel";
import RepositoriesSidebar from "./dashboard/RepositoriesSidebar";
import RightSidebar from "./dashboard/RightSidebar";
import { getGreeting } from "./dashboard/helpers";
import { errorToast } from "../lib/toast";
import type { NotificationItem, Repo } from "./dashboard/types";

function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

function LoggedOutHero() {
  return (
    <div className="min-h-[70vh] px-4 flex items-center justify-center bg-[#f6f8fa]">
      <div className="w-full max-w-2xl rounded-md border border-[#d0d7de] bg-white px-8 py-10 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-[#24292f] mb-2">Welcome to CollabHub</h1>
        <p className="text-sm text-[#57606a]">
          Track repositories, pull requests, issues, and discussions in one place.
          Sign in to view your dashboard.
        </p>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { login, isLoading: userLoading } = useContext(userContext);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!login) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        const [repoList, notificationList] = await Promise.all([
          fetchAllPages<Repo>(connect, "/repositories/"),
          fetchAllPages<NotificationItem>(connect, "/notifications/"),
        ]);

        setRepos(repoList);
        setNotifications(notificationList);
      } catch (err) {
        errorToast(err, "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [login]);

  const filteredRepos = useMemo(() => {
    const query = repoSearch.trim().toLowerCase();
    if (!query) {
      return repos;
    }
    return repos.filter((repo) => repo.name.toLowerCase().includes(query));
  }, [repos, repoSearch]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  if (userLoading) {
    return <DashboardLoading />;
  }

  if (!login) {
    return <LoggedOutHero />;
  }

  const userName = login.first_name || login.email;

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 rounded-md border border-[#d0d7de] bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#57606a]">Home</p>
          <h1 className="text-[26px] leading-tight font-semibold text-[#24292f] mt-1">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-[#57606a] mt-2">
            Overview of repositories and recent updates from your workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ddf4ff] text-[#0969da] border border-[#b6e3ff]">
              <BookOpen className="w-3.5 h-3.5" />
              {repos.length} repositories
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fff8c5] text-[#9a6700] border border-[#eac54f]">
              <Clock3 className="w-3.5 h-3.5" />
              {unreadCount} unread notifications
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr_300px] gap-6">
          <RepositoriesSidebar
            filteredRepos={filteredRepos}
            loading={loading}
            onSearchChange={setRepoSearch}
            repoSearch={repoSearch}
          />

          <ActivityPanel
            loading={loading}
            notifications={notifications}
            unreadCount={unreadCount}
          />

          <RightSidebar repos={repos} unreadCount={unreadCount} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
