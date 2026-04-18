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
      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        </div>

        <div className="p-4 space-y-2">
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors group"
            to="/new"
          >
            <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">New repository</p>
              <p className="text-xs text-muted-foreground/70">Create a new project</p>
            </div>
          </Link>

          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors group"
            to="/profile"
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Your profile</p>
              <p className="text-xs text-muted-foreground/70">View your repositories</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-muted/50 border border-border rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{repos.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Repositories</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{publicRepoCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Public</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{privateRepoCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Private</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-md p-3 text-center">
            <p className="text-2xl font-semibold text-primary">{unreadCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Unread</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">Explore your projects</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Browse your repositories to manage branches, pull requests, and issues.
        </p>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          to="/profile"
        >
          View all repos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
