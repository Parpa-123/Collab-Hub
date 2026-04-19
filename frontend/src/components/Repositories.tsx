import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Globe,
  Lock,
  Loader2,
  Search,
  Plus,
  Filter,
} from "lucide-react";
import { userContext } from "../Context/userContext";
import connect from "../axios/connect";
import { fetchAllPages } from "../lib/pagination";
import { errorToast } from "../lib/toast";
import type { Repo } from "./dashboard/types";

type VisibilityFilter = "all" | "public" | "private";

function roleBadgeStyle(role: string | null): string {
  if (!role) return "";
  switch (role.toLowerCase()) {
    case "owner":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "admin":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "maintainer":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "contributor":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "viewer":
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function Repositories() {
  const { login } = useContext(userContext);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  useEffect(() => {
    if (!login) return;

    const fetchRepos = async () => {
      setLoading(true);
      try {
        const repoList = await fetchAllPages<Repo>(connect, "/repositories/");
        setRepos(repoList);
      } catch (err) {
        errorToast(err, "Failed to load repositories");
      } finally {
        setLoading(false);
      }
    };

    void fetchRepos();
  }, [login]);

  const filteredRepos = useMemo(() => {
    let result = repos;

    // Filter by visibility
    if (visibilityFilter !== "all") {
      result = result.filter((repo) => repo.visibility === visibilityFilter);
    }

    // Filter by search query
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          repo.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [repos, search, visibilityFilter]);

  const counts = useMemo(
    () => ({
      all: repos.length,
      public: repos.filter((r) => r.visibility === "public").length,
      private: repos.filter((r) => r.visibility === "private").length,
    }),
    [repos]
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
              Repositories
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {repos.length} repositories associated with your account
            </p>
          </div>

          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors self-start"
          >
            <Plus className="w-4 h-4" />
            New
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="bg-card border border-border rounded-lg shadow-sm mb-5">
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 bg-muted/50 border border-border rounded-md px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground/60"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a repository..."
                value={search}
              />
            </div>

            {/* Visibility Filter */}
            <div className="flex items-center gap-1 shrink-0">
              <Filter className="w-4 h-4 text-muted-foreground mr-1" />
              {(["all", "public", "private"] as VisibilityFilter[]).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setVisibilityFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      visibilityFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} (
                    {counts[filter]})
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Repository List */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading repositories...
              </span>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search || visibilityFilter !== "all"
                  ? "No repositories match your filters."
                  : "You don't have any repositories yet."}
              </p>
              {!search && visibilityFilter === "all" && (
                <Link
                  to="/new"
                  className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="w-4 h-4" /> Create your first repository
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRepos.map((repo) => (
                <Link
                  key={repo.slug}
                  to={`/${repo.slug}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
                >
                  {/* Visibility icon */}
                  <div className="pt-0.5 shrink-0">
                    {repo.visibility === "public" ? (
                      <Globe className="w-4 h-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                    )}
                  </div>

                  {/* Repo info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-primary group-hover:underline truncate">
                        {repo.name}
                      </h3>

                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          repo.visibility === "public"
                            ? "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20"
                        }`}
                      >
                        {repo.visibility}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  {/* Role badge */}
                  {repo.my_role && (
                    <div className="shrink-0 pt-0.5">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${roleBadgeStyle(repo.my_role)}`}
                      >
                        {repo.my_role}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
