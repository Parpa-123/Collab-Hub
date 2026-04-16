import { ArrowRight, Eye, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { Repo } from "./types";

interface RightSidebarProps {
  repos: Repo[];
  unreadCount: number;
}

export default function RightSidebar({ repos, unreadCount }: RightSidebarProps) {
  const publicRepoCount = repos.filter((repo) => repo.visibility === "public").length;
  const privateRepoCount = repos.filter((repo) => repo.visibility === "private").length;

  return (
    <aside className="space-y-5">
      <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d8dee4] bg-[#f6f8fa]">
          <h2 className="text-sm font-semibold text-[#24292f]">Quick actions</h2>
        </div>

        <div className="p-4 space-y-2">
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-[#d0d7de] hover:bg-[#f6f8fa] transition-colors group"
            to="/new"
          >
            <div className="w-8 h-8 rounded-md bg-[#dafbe1] flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#1a7f37]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#24292f]">New repository</p>
              <p className="text-xs text-[#6e7781]">Create a new project</p>
            </div>
          </Link>

          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-[#d0d7de] hover:bg-[#f6f8fa] transition-colors group"
            to="/profile"
          >
            <div className="w-8 h-8 rounded-md bg-[#ddf4ff] flex items-center justify-center">
              <Eye className="w-4 h-4 text-[#0969da]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#24292f]">Your profile</p>
              <p className="text-xs text-[#6e7781]">View your repositories</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d8dee4] bg-[#f6f8fa]">
          <h2 className="text-sm font-semibold text-[#24292f]">Overview</h2>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-[#f6f8fa] border border-[#d8dee4] rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-[#24292f]">{repos.length}</p>
            <p className="text-xs text-[#57606a] mt-0.5">Repositories</p>
          </div>
          <div className="bg-[#f6f8fa] border border-[#d8dee4] rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-[#24292f]">{publicRepoCount}</p>
            <p className="text-xs text-[#57606a] mt-0.5">Public</p>
          </div>
          <div className="bg-[#f6f8fa] border border-[#d8dee4] rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-[#24292f]">{privateRepoCount}</p>
            <p className="text-xs text-[#57606a] mt-0.5">Private</p>
          </div>
          <div className="bg-[#f6f8fa] border border-[#d8dee4] rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-[#0969da]">{unreadCount}</p>
            <p className="text-xs text-[#57606a] mt-0.5">Unread</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#24292f] mb-1">Explore your projects</h3>
        <p className="text-xs text-[#57606a] mb-3">
          Browse your repositories to manage branches, pull requests, and issues.
        </p>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-[#0969da] hover:underline"
          to="/profile"
        >
          View all repos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
