import { BookOpen, Loader2, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { renderVisibilityIcon } from "./helpers";
import type { Repo } from "./types";

interface RepositoriesSidebarProps {
  filteredRepos: Repo[];
  loading: boolean;
  onSearchChange: (value: string) => void;
  repoSearch: string;
}

function RepoSearch({
  onSearchChange,
  repoSearch,
}: Pick<RepositoriesSidebarProps, "onSearchChange" | "repoSearch">) {
  return (
    <div className="px-3 py-2.5 border-b border-border">
      <div className="flex items-center gap-2 bg-card border border-border rounded-md px-2.5 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground/60"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Find a repository"
          value={repoSearch}
        />
      </div>
    </div>
  );
}

function RepoList({
  filteredRepos,
  loading,
  repoSearch,
}: Pick<RepositoriesSidebarProps, "filteredRepos" | "loading" | "repoSearch">) {
  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
        Loading...
      </div>
    );
  }

  if (filteredRepos.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
        {repoSearch ? "No matching repositories." : "No repositories yet."}
      </div>
    );
  }

  return (
    <>
      {filteredRepos.map((repo) => (
        <Link
          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
          key={repo.slug}
          to={`/${repo.slug}`}
        >
          <div className="mt-0.5">{renderVisibilityIcon(repo.visibility)}</div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary hover:underline truncate">
              {repo.name}
            </p>

            {repo.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{repo.description}</p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  repo.visibility === "public"
                    ? "bg-green-500/10 text-green-600 dark:text-green-500"
                    : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                }`}
              >
                {repo.visibility}
              </span>

              {repo.my_role && <span className="text-[10px] text-muted-foreground/70">{repo.my_role}</span>}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

export default function RepositoriesSidebar(props: RepositoriesSidebarProps) {
  return (
    <aside>
      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/50">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            Top repositories
          </h2>
          
        </div>

        <RepoSearch onSearchChange={props.onSearchChange} repoSearch={props.repoSearch} />

        <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
          <RepoList
            filteredRepos={props.filteredRepos}
            loading={props.loading}
            repoSearch={props.repoSearch}
          />
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/50">
          <Link
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-card border border-border hover:bg-accent rounded-md py-2 transition-colors"
            to="/new"
          >
            <Plus className="w-4 h-4" />
            New repository
          </Link>
        </div>
      </div>
    </aside>
  );
}
