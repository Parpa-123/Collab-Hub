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
    <div className="px-3 py-2.5 border-b border-[#d8dee4]">
      <div className="flex items-center gap-2 bg-white border border-[#d0d7de] rounded-md px-2.5 py-1.5 focus-within:border-[#0969da] focus-within:shadow-[0_0_0_3px_rgba(9,105,218,0.15)]">
        <Search className="w-3.5 h-3.5 text-[#57606a]" />
        <input
          className="bg-transparent outline-none text-sm w-full text-[#24292f] placeholder:text-[#8c959f]"
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
      <div className="px-4 py-8 text-center text-[#57606a] text-sm">
        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
        Loading...
      </div>
    );
  }

  if (filteredRepos.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[#57606a] text-sm">
        {repoSearch ? "No matching repositories." : "No repositories yet."}
      </div>
    );
  }

  return (
    <>
      {filteredRepos.map((repo) => (
        <Link
          className="flex items-start gap-3 px-4 py-3 hover:bg-[#f6f8fa] transition-colors group"
          key={repo.slug}
          to={`/${repo.slug}`}
        >
          <div className="mt-0.5">{renderVisibilityIcon(repo.visibility)}</div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#0969da] hover:underline truncate">
              {repo.name}
            </p>

            {repo.description && (
              <p className="text-xs text-[#57606a] mt-0.5 truncate">{repo.description}</p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  repo.visibility === "public"
                    ? "bg-[#dafbe1] text-[#1a7f37]"
                    : "bg-[#fff8c5] text-[#9a6700]"
                }`}
              >
                {repo.visibility}
              </span>

              {repo.my_role && <span className="text-[10px] text-[#6e7781]">{repo.my_role}</span>}
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
      <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d8dee4] flex items-center justify-between bg-[#f6f8fa]">
          <h2 className="text-sm font-semibold text-[#24292f] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#57606a]" />
            Top repositories
          </h2>
          
        </div>

        <RepoSearch onSearchChange={props.onSearchChange} repoSearch={props.repoSearch} />

        <div className="max-h-[420px] overflow-y-auto divide-y divide-[#d8dee4]">
          <RepoList
            filteredRepos={props.filteredRepos}
            loading={props.loading}
            repoSearch={props.repoSearch}
          />
        </div>

        <div className="px-4 py-3 border-t border-[#d8dee4] bg-[#f6f8fa]">
          <Link
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[#24292f] bg-white border border-[#d0d7de] hover:bg-[#f3f4f6] rounded-md py-2 transition-colors"
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
