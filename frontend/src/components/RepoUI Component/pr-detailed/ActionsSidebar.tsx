import { CheckCircle2, GitMerge, GitPullRequest, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PullRequestAction, PullRequestDetail } from "./types";

interface ActionsSidebarProps {
  actionLoading: PullRequestAction | null;
  alreadyApproved: boolean;
  approvedCount: number;
  canApprove: boolean;
  canMerge: boolean;
  isMaintainer: boolean;
  onApprove: () => void;
  onClose: () => void;
  onMerge: () => void;
  onReopen: () => void;
  pr: PullRequestDetail;
}

export default function ActionsSidebar({
  actionLoading,
  alreadyApproved,
  approvedCount,
  canApprove,
  canMerge,
  isMaintainer,
  onApprove,
  onClose,
  onMerge,
  onReopen,
  pr,
}: ActionsSidebarProps) {
  return (
    <div className="w-full lg:w-72 shrink-0 space-y-4">
      <div className="border border-border rounded-md bg-card p-4 shadow-sm text-foreground">
        <h3 className="font-semibold text-sm mb-3">Review and Actions</h3>

        {pr.status === "OPEN" && (
          <div className="space-y-3">
            {canApprove && (
              <Button
                className={`w-full justify-start ${
                  alreadyApproved
                    ? "bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/10 border-green-500/20 cursor-default"
                    : "bg-card text-muted-foreground border-border border hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-500 hover:border-green-500/30"
                }`}
                disabled={alreadyApproved || actionLoading === "approve"}
                onClick={onApprove}
                variant="outline"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {alreadyApproved
                  ? "Approved"
                  : actionLoading === "approve"
                    ? "Approving..."
                    : "Approve PR"}
              </Button>
            )}

            <div>
              <Button
                className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                disabled={!canMerge || actionLoading === "merge"}
                onClick={onMerge}
              >
                <GitMerge className="w-4 h-4 mr-2" />
                {actionLoading === "merge" ? "Merging..." : "Merge Pull Request"}
              </Button>

              {pr.has_conflicts && (
                <p className="text-[11px] text-destructive mt-1 font-medium px-1">
                  Resolve conflicts before merging.
                </p>
              )}
              {!isMaintainer && !pr.has_conflicts && (
                <p className="text-[11px] text-muted-foreground mt-1 px-1">
                  Only maintainers can merge PRs.
                </p>
              )}
            </div>

            <hr className="border-border my-2" />

            <Button
              className="w-full justify-start border-destructive/20 text-destructive hover:bg-destructive/10"
              disabled={actionLoading === "close"}
              onClick={onClose}
              variant="outline"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {actionLoading === "close" ? "Closing..." : "Close without merging"}
            </Button>
          </div>
        )}

        {pr.status === "CLOSED" && (
          <Button
            className="w-full justify-start text-primary border-primary/20 hover:bg-primary/10"
            disabled={actionLoading === "reopen"}
            onClick={onReopen}
            variant="outline"
          >
            <GitPullRequest className="w-4 h-4 mr-2" />
            {actionLoading === "reopen" ? "Reopening..." : "Reopen PR"}
          </Button>
        )}

        {pr.status === "MERGED" && (
          <p className="text-sm text-muted-foreground italic mt-2">
            This pull request was successfully merged. No further actions can be taken.
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Approvals required:</span>
          <span className={`font-semibold ${approvedCount >= 1 ? "text-green-500" : "text-foreground"}`}>
            {approvedCount} / 1
          </span>
        </div>
      </div>
    </div>
  );
}
