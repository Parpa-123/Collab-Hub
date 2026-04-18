import { Link } from "react-router-dom";
import type { JSX } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitMerge,
  GitPullRequest,
  MessageCircle,
  RotateCcw,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import CommentList from "../../comments/CommentList";
import type { PullRequest, PullRequestAction, Review } from "./types";

dayjs.extend(relativeTime);

interface PullRequestRowProps {
  approvingId: number | null;
  canApprove: boolean;
  isExpanded: boolean;
  myRole: string | null;
  onAction: (prId: number, action: PullRequestAction) => void;
  onApprove: (prId: number) => void;
  onToggleComments: (prId: number) => void;
  pr: PullRequest;
  reviews: Review[];
  slug: string;
  statusBadge: (status: PullRequest["status"]) => JSX.Element;
}

export default function PullRequestRow({
  approvingId,
  canApprove,
  isExpanded,
  myRole,
  onAction,
  onApprove,
  onToggleComments,
  pr,
  reviews,
  slug,
  statusBadge,
}: PullRequestRowProps) {
  const approvedCount = reviews.filter((review) => review.status === "APPROVED").length;
  const alreadyApproved = reviews.some((review) => review.status === "APPROVED");

  return (
    <div className="text-foreground">
      <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <GitPullRequest className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <Link
              className="text-sm font-medium text-primary hover:underline truncate"
              to={`/${slug}/pullrequests/${pr.id}`}
            >
              {pr.title}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">
              #{pr.id} - {pr.source_name} to {pr.target_name} - opened{" "}
              {dayjs(pr.created_at).fromNow()}
            </p>

            {pr.status === "OPEN" && reviews.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    approvedCount > 0 ? "text-green-500" : "text-muted-foreground/50"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {approvedCount} approval{approvedCount !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {statusBadge(pr.status)}

          {pr.status === "OPEN" && (
            <div className="flex items-center gap-1">
              {canApprove && (
                <button
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition ${
                    alreadyApproved
                      ? "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20 cursor-default"
                      : "bg-card border-border text-muted-foreground hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30"
                  }`}
                  disabled={approvingId === pr.id || alreadyApproved}
                  onClick={() => onApprove(pr.id)}
                  title={alreadyApproved ? "Already approved" : "Approve this PR"}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {alreadyApproved ? "Approved" : approvingId === pr.id ? "..." : "Approve"}
                </button>
              )}

              <button
                className="p-1 text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10 rounded transition-colors"
                onClick={() => onAction(pr.id, "merge")}
                title="Merge"
              >
                <GitMerge className="w-4 h-4" />
              </button>

              <button
                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                onClick={() => onAction(pr.id, "close")}
                title="Close"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {pr.status === "CLOSED" && (
            <button
              className="p-1 text-muted-foreground hover:text-green-600 hover:bg-green-500/10 rounded transition-colors"
              onClick={() => onAction(pr.id, "reopen")}
              title="Reopen"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <button
          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
          onClick={() => onToggleComments(pr.id)}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Comments
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 ml-auto" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-auto" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 py-4 bg-muted/10 border-t border-border">
            <CommentList model="pullrequest" myRole={myRole} objectId={pr.id} slug={slug} />
          </div>
        )}
      </div>
    </div>
  );
}
