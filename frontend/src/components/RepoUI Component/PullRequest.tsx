import { useEffect, useState } from "react";
import connect from "../../axios/connect";
import { useParams } from "react-router-dom";
import {
  GitPullRequest, GitMerge, XCircle, RotateCcw, Plus, Search, CheckCircle2, ThumbsUp,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

dayjs.extend(relativeTime);

interface Branch {
  id: number;
  name: string;
}

interface PR {
  id: number;
  title: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  source_name: string;
  target_name: string;
  created_by: number;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
}

interface Review {
  id: number;
  reviewer: number;
  status: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
}

const statusFilter = ["OPEN", "CLOSED", "MERGED"] as const;

const PullRequests = () => {
  const { slug } = useParams();

  const [prs, setPrs] = useState<PR[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filter, setFilter] = useState<"OPEN" | "CLOSED" | "MERGED">("OPEN");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);

  // Per-PR review state: prId -> Review[]
  const [reviewsMap, setReviewsMap] = useState<Record<number, Review[]>>({});
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    source_branch: "",
    target_branch: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPRs = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/pull-requests/`);
      setPrs(res.data);
    } catch (err) {
      console.error("Failed to fetch pull requests", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/branches/`);
      setBranches(res.data);
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const fetchMyRole = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/my-role/`);
      setMyRole(res.data.role);
    } catch (err) {
      console.error("Failed to fetch role", err);
    }
  };

  const fetchReviews = async (prId: number) => {
    try {
      const res = await connect.get(`/repositories/${slug}/pull-requests/${prId}/reviews/`);
      setReviewsMap((prev) => ({ ...prev, [prId]: res.data }));
    } catch (err) {
      console.error(`Failed to fetch reviews for PR ${prId}`, err);
    }
  };

  useEffect(() => {
    fetchPRs();
    fetchBranches();
    fetchMyRole();
  }, [slug]);

  // Fetch reviews for all open PRs whenever PR list changes
  useEffect(() => {
    prs.filter((pr) => pr.status === "OPEN").forEach((pr) => fetchReviews(pr.id));
  }, [prs]);

  const canApprove = myRole === "admin" || myRole === "maintainer";

  const getApprovalStatus = (prId: number) => {
    const reviews = reviewsMap[prId] || [];
    const approved = reviews.filter((r) => r.status === "APPROVED").length;
    return { reviews, approved };
  };

  const handleApprove = async (prId: number) => {
    setActionError(null);
    setApprovingId(prId);
    try {
      // Try to create a review with APPROVED status directly
      await connect.post(`/repositories/${slug}/pull-requests/${prId}/reviews/`, {
        status: "APPROVED",
      });
      await fetchReviews(prId);
    } catch (err: any) {
      const detail =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})?.[0] ||
        "Failed to approve.";
      setActionError(String(detail));
    } finally {
      setApprovingId(null);
    }
  };

  const handleAction = async (prId: number, action: "merge" | "close" | "reopen") => {
    setActionError(null);
    try {
      await connect.post(`/repositories/${slug}/pull-requests/${prId}/${action}/`);
      fetchPRs();
    } catch (err: any) {
      setActionError(err.response?.data?.error || `Failed to ${action} pull request.`);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.source_branch || !form.target_branch) {
      setFormError("Title, source branch, and target branch are required.");
      return;
    }
    if (form.source_branch === form.target_branch) {
      setFormError("Source and target branches cannot be the same.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await connect.post(`/repositories/${slug}/pull-requests/`, {
        title: form.title,
        description: form.description,
        source_branch: Number(form.source_branch),
        target_branch: Number(form.target_branch),
      });
      setShowCreate(false);
      setForm({ title: "", description: "", source_branch: "", target_branch: "" });
      fetchPRs();
    } catch (err: any) {
      setFormError(
        err.response?.data?.non_field_errors?.[0] ||
        String(Object.values(err.response?.data || {})?.[0] || "Failed to create pull request.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = prs
    .filter((pr) => pr.status === filter)
    .filter((pr) =>
      pr.title.toLowerCase().includes(search.toLowerCase()) ||
      pr.source_name?.toLowerCase().includes(search.toLowerCase())
    );

  const countByStatus = (s: string) => prs.filter((pr) => pr.status === s).length;

  const statusBadge = (status: PR["status"]) => {
    const map: Record<string, string> = {
      OPEN: "bg-green-100 text-green-700",
      CLOSED: "bg-red-100 text-red-700",
      MERGED: "bg-purple-100 text-purple-700",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="px-6 py-6 bg-[#f6f8fa] min-h-full font-sans text-[#1f2328]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-[#636c76]" />
          <h2 className="text-base font-semibold">Pull Requests</h2>
          <span className="bg-[#ddf4ff] text-[#0969da] text-xs font-medium px-2 py-0.5 rounded-full">
            {countByStatus("OPEN")} open
          </span>
        </div>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          New pull request
        </Button>
      </div>

      {actionError && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {actionError}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center border border-[#d0d7de] rounded-md bg-white px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-[#636c76] mr-2" />
          <input
            className="outline-none text-sm w-full"
            placeholder="Search pull requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {statusFilter.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition ${filter === s
                  ? "bg-[#0969da] text-white border-[#0969da]"
                  : "bg-white border-[#d0d7de] text-[#1f2328] hover:bg-[#f6f8fa]"
                }`}
            >
              {s === "OPEN" && <GitPullRequest className="w-3.5 h-3.5" />}
              {s === "MERGED" && <GitMerge className="w-3.5 h-3.5" />}
              {s === "CLOSED" && <XCircle className="w-3.5 h-3.5" />}
              {s} ({countByStatus(s)})
            </button>
          ))}
        </div>
      </div>

      {/* PR List */}
      <div className="border border-[#d0d7de] rounded-md bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-[#d0d7de]">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <GitPullRequest className="w-10 h-10 text-[#d0d7de] mx-auto mb-3" />
              <p className="text-sm text-[#636c76]">No {filter.toLowerCase()} pull requests found.</p>
            </div>
          ) : (
            filtered.map((pr) => {
              const { reviews, approved } = getApprovalStatus(pr.id);
              const alreadyApproved = reviews.some((r) => r.status === "APPROVED");

              return (
                <div
                  key={pr.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-[#f6f8fa] transition-colors"
                >
                  {/* Left: title + meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <GitPullRequest className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1f2328] truncate">
                        {pr.title}
                      </p>
                      <p className="text-xs text-[#636c76] mt-0.5">
                        #{pr.id} · {pr.source_name} → {pr.target_name} · opened {dayjs(pr.created_at).fromNow()}
                      </p>

                      {/* Approval summary for open PRs */}
                      {pr.status === "OPEN" && reviews.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${approved > 0 ? "text-green-600" : "text-gray-400"}`} />
                          <span className="text-xs text-[#636c76]">
                            {approved} approval{approved !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: badges + actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {statusBadge(pr.status)}

                    {pr.status === "OPEN" && (
                      <div className="flex items-center gap-1">
                        {/* Approve button — only admin/maintainer, not shown if already approved */}
                        {canApprove && (
                          <button
                            onClick={() => handleApprove(pr.id)}
                            disabled={approvingId === pr.id || alreadyApproved}
                            title={alreadyApproved ? "Already approved" : "Approve this PR"}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition ${alreadyApproved
                                ? "bg-green-50 text-green-700 border-green-200 cursor-default"
                                : "bg-white border-[#d0d7de] text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                              }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {alreadyApproved ? "Approved" : approvingId === pr.id ? "..." : "Approve"}
                          </button>
                        )}

                        {/* Merge */}
                        <button
                          onClick={() => handleAction(pr.id, "merge")}
                          title="Merge"
                          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          <GitMerge className="w-4 h-4" />
                        </button>

                        {/* Close */}
                        <button
                          onClick={() => handleAction(pr.id, "close")}
                          title="Close"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {pr.status === "CLOSED" && (
                      <button
                        onClick={() => handleAction(pr.id, "reopen")}
                        title="Reopen"
                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create PR Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Open a pull request</DialogTitle>
            <DialogDescription>Choose branches and describe your changes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Source branch</label>
                <Select
                  value={form.source_branch}
                  onValueChange={(v: string) => setForm((f) => ({ ...f, source_branch: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Target branch</label>
                <Select
                  value={form.target_branch}
                  onValueChange={(v: string) => setForm((f) => ({ ...f, target_branch: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
              <Input
                placeholder="PR title"
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description (optional)</label>
              <textarea
                rows={3}
                placeholder="Describe your changes..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create pull request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PullRequests;
