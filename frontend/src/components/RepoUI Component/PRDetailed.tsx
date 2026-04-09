import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import connect from "../../axios/connect";
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  GitMerge,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle,
  FileCode,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import CommentList from "../comments/CommentList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

dayjs.extend(relativeTime);

interface PR {
  id: number;
  title: string;
  description: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  source_name: string;
  target_name: string;
  created_by: number;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  has_conflicts: boolean;
  is_mergeable: boolean;
}

interface Review {
  id: number;
  reviewer: number;
  status: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
}

interface FileDiff {
  file_path: string;
  status: "modified" | "added" | "removed";
  diff: string[];
  additions: number;
  deletions: number;
}

const PRDetailed = () => {
  const { slug, id } = useParams();
  const [pr, setPr] = useState<PR | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "files">("overview");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  // Diff states
  const [diffFiles, setDiffFiles] = useState<FileDiff[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffPollCount, setDiffPollCount] = useState(0);

  // Actions states
  const [actionLoading, setActionLoading] = useState<"merge" | "close" | "reopen" | "approve" | null>(null);

  const fetchMyRole = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/my-role/`);
      setMyRole(res.data.role);
    } catch {
      console.error("Failed to fetch role");
    }
  };

  const fetchPR = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/pull-requests/${id}/`);
      setPr(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load PR.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/pull-requests/${id}/reviews/`);
      setReviews(res.data.results ?? res.data);
    } catch (err: any) {
      console.error("Failed to load reviews:", err);
    }
  };

  const fetchDiff = async () => {
    try {
      setDiffLoading(true);
      const res = await connect.get(`/repositories/${slug}/pull-requests/${id}/diff/`);
      
      if (res.data.status === "processing") {
        // Poll again after 2 seconds (up to 10 times to prevent infinite loop for now)
        if (diffPollCount < 10) {
          setTimeout(() => {
            setDiffPollCount((prev) => prev + 1);
          }, 2000);
        } else {
          setDiffLoading(false);
          setError("Diff calculation is taking too long. Please refresh later.");
        }
      } else {
        setDiffFiles(res.data.results ?? []);
        setDiffLoading(false);
      }
    } catch (err: any) {
      console.error("Failed to load diff", err);
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    if (slug && id) {
      fetchMyRole();
      fetchPR();
      
      fetchReviews();
    }
  }, [slug, id]);

  // Re-fetch diff whenever tab becomes active or polling triggers
  useEffect(() => {
    if (activeTab === "files" && pr) {
      fetchDiff();
    }
  }, [activeTab, diffPollCount]);

  const handleAction = async (action: "close" | "reopen") => {
    setActionLoading(action);
    setError(null);
    try {
      await connect.post(`/repositories/${slug}/pull-requests/${id}/${action}/`);
      await fetchPR();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${action} pull request.`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmMerge = async () => {
    setActionLoading("merge");
    setMergeModalOpen(false);
    setError(null);
    
    const previousStatus = pr?.status;
    // Optimistic UI update
    setPr(prev => prev ? { ...prev, status: "MERGED" } : null);
    
    try {
      await connect.post(`/repositories/${slug}/pull-requests/${id}/merge/`);
      fetchPR();
    } catch (err: any) {
      setPr(prev => prev && previousStatus ? { ...prev, status: previousStatus } : null);
      setError(
        err.response?.data?.error || 
        err.response?.data?.detail || 
        "Failed to merge pull request."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    setActionLoading("approve");
    setError(null);
    try {
      await connect.post(`/repositories/${slug}/pull-requests/${id}/reviews/`, {
        status: "APPROVED",
      });
      await fetchReviews();
    } catch (err: any) {
      const detail =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})?.[0] ||
        "Failed to approve.";
      setError(String(detail));
    } finally {
      setActionLoading(null);
    }
  };

  if (!pr && loading && !error) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading pull request…</span>
      </div>
    );
  }

  if (error && !pr) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm">{error}</p>
        <Link to={`/${slug}/pullrequests`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to PRs
        </Link>
      </div>
    );
  }

  if (!pr) return null;

  const isMaintainer = myRole === "admin" || myRole === "maintainer";
  const canApprove = isMaintainer;
  const canMerge = isMaintainer && !pr.has_conflicts && pr.status === "OPEN";

  const approvedCount = reviews.filter((r) => r.status === "APPROVED").length;
  const alreadyApproved = reviews.some((r) => r.status === "APPROVED");

  const statusMap = {
    OPEN: { color: "bg-green-600 text-white", icon: GitPullRequest, label: "Open" },
    MERGED: { color: "bg-purple-600 text-white", icon: GitMerge, label: "Merged" },
    CLOSED: { color: "bg-red-600 text-white", icon: XCircle, label: "Closed" },
  };

  const StatusIcon = statusMap[pr.status].icon;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-normal text-[#1f2328] flex items-center gap-2 leading-tight">
            <span className="font-semibold">{pr.title}</span>
            <span className="text-gray-400 font-light">#{pr.id}</span>
          </h1>

          <div className="flex gap-2">
            <Link to={`/${slug}/pullrequests`} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 border rounded-md px-3 py-1.5 transition-colors">
              <ArrowLeft size={14} /> Back
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${statusMap[pr.status].color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusMap[pr.status].label}
          </span>
          <span className="ml-1">
            <span className="font-semibold text-gray-700">Author</span> wants to merge into{" "}
            <span className="font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{pr.target_name}</span>{" "}
            from <span className="font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{pr.source_name}</span>{" "}
            • opened {dayjs(pr.created_at).fromNow()}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6 flex gap-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "overview" ? "border-orange-500 text-[#1f2328]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "files" ? "border-orange-500 text-[#1f2328]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <FileCode className="w-4 h-4" />
          Files changed
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Description box */}
              <div className="border border-[#d0d7de] rounded-md overflow-hidden bg-white">
                <div className="bg-[#f6f8fa] px-4 py-2 border-b border-[#d0d7de] text-xs font-semibold text-gray-600">
                  Description
                </div>
                <div className="p-4 text-sm text-[#1f2328] whitespace-pre-wrap">
                  {pr.description || <span className="text-gray-400 italic">No description provided.</span>}
                </div>
              </div>

              {/* Discussion / Comments */}
              <div className="pt-2">
                <h3 className="text-lg font-semibold border-b pb-2 mb-4">Discussion</h3>
                <CommentList slug={slug!} model="pullrequest" objectId={pr.id} myRole={myRole} />
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div>
              {diffLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                  <p className="text-sm">Generating diff... this may take a moment.</p>
                </div>
              ) : diffFiles.length === 0 ? (
                <div className="py-20 text-center text-gray-500 border rounded-md">
                  <p className="text-sm">No files changed.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {diffFiles.map((file, idx) => (
                    <div key={idx} className="border border-[#d0d7de] rounded-md overflow-hidden bg-white shadow-sm">
                      <div className="bg-[#f6f8fa] px-4 py-2 border-b border-[#d0d7de] flex items-center justify-between">
                        <span className="text-sm font-semibold font-mono text-[#1f2328]">
                          {file.file_path}
                        </span>
                        <div className="text-xs font-mono flex gap-3 text-gray-500">
                          <span className="text-green-600">+{file.additions}</span>
                          <span className="text-red-600">-{file.deletions}</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto bg-white text-xs font-mono leading-relaxed p-2">
                        {file.diff.map((line, lidx) => {
                          let rowClass = "px-2 py-0.5 whitespace-pre ";
                          if (line.startsWith("+") && !line.startsWith("+++")) {
                            rowClass += "bg-[#e6ffed] text-[#24292e]";
                          } else if (line.startsWith("-") && !line.startsWith("---")) {
                            rowClass += "bg-[#ffeef0] text-[#24292e]";
                          } else if (line.startsWith("@@")) {
                            rowClass += "bg-[#f1f8ff] text-[#0969da] py-2";
                          } else {
                            rowClass += "text-gray-500";
                          }
                          return (
                            <div key={lidx} className={rowClass}>
                              {line || " "}
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-4 border-t border-[#d0d7de] bg-white">
                        <CommentList
                          slug={slug!}
                          model="pullrequest"
                          objectId={pr.id}
                          path={file.file_path}
                          myRole={myRole}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="border border-[#d0d7de] rounded-md bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Review & Actions</h3>

            {pr.status === "OPEN" && (
              <div className="space-y-3">
                {/* Approve Button */}
                {canApprove && (
                  <Button
                    className={`w-full justify-start ${
                      alreadyApproved
                        ? "bg-green-50 text-green-700 hover:bg-green-50 border-green-200 cursor-default"
                        : "bg-white text-gray-700 border hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    }`}
                    variant="outline"
                    onClick={handleApprove}
                    disabled={alreadyApproved || actionLoading === "approve"}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {alreadyApproved ? "Approved" : actionLoading === "approve" ? "Approving..." : "Approve PR"}
                  </Button>
                )}

                {/* Merge Button */}
                <div>
                  <Button
                    className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    onClick={() => setMergeModalOpen(true)}
                    disabled={!canMerge || actionLoading === "merge"}
                  >
                    <GitMerge className="w-4 h-4 mr-2" />
                    {actionLoading === "merge" ? "Merging..." : "Merge Pull Request"}
                  </Button>
                  
                  {pr.has_conflicts && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium px-1">
                      Resolve conflicts before merging.
                    </p>
                  )}
                  {!isMaintainer && !pr.has_conflicts && (
                    <p className="text-[11px] text-gray-500 mt-1 px-1">
                      Only maintainers can merge PRs.
                    </p>
                  )}
                </div>

                <hr className="border-gray-200 my-2" />

                {/* Close Button */}
                <Button
                  className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                  variant="outline"
                  onClick={() => handleAction("close")}
                  disabled={actionLoading === "close"}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {actionLoading === "close" ? "Closing..." : "Close without merging"}
                </Button>
              </div>
            )}

            {pr.status === "CLOSED" && (
              <Button
                className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
                variant="outline"
                onClick={() => handleAction("reopen")}
                disabled={actionLoading === "reopen"}
              >
                <GitPullRequest className="w-4 h-4 mr-2" />
                {actionLoading === "reopen" ? "Reopening..." : "Reopen PR"}
              </Button>
            )}

            {pr.status === "MERGED" && (
              <p className="text-sm text-gray-500 italic mt-2">
                This pull request was successfully merged. No further actions can be taken.
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Approvals required:</span>
              <span className={`font-semibold ${approvedCount >= 1 ? "text-green-600" : "text-gray-900"}`}>
                {approvedCount} / 1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Merge Confirmation Modal */}
      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Merge</DialogTitle>
            <DialogDescription>
              Are you sure you want to merge <strong>{pr.source_name}</strong> into <strong>{pr.target_name}</strong>?
              This action will close the pull request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMergeModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={confirmMerge}>
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PRDetailed;