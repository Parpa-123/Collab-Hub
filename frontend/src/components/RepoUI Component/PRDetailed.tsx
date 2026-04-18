import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  FileCode,
  Loader2,
  MessageCircle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import connect from "../../axios/connect";
import { fetchAllPages } from "@/lib/pagination";
import CommentList from "../comments/CommentList";
import ActionsSidebar from "./pr-detailed/ActionsSidebar";
import DiffFilesPanel from "./pr-detailed/DiffFilesPanel";
import MergeConfirmationDialog from "./pr-detailed/MergeConfirmationDialog";
import { getApiErrorMessage, getStatusMeta, normalizeListResponse } from "./pr-detailed/helpers";
import { errorToast, successToast } from "../../lib/toast";
import type {
  FileDiff,
  PullRequestAction,
  PullRequestDetail,
  PullRequestReview,
} from "./pr-detailed/types";

dayjs.extend(relativeTime);

const MAX_DIFF_POLL_ATTEMPTS = 10;
const DIFF_POLL_INTERVAL_MS = 2000;

type DiffResponsePayload = { status?: string; results?: FileDiff[] } | FileDiff[];

const PRDetailed = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();

  const [pr, setPr] = useState<PullRequestDetail | null>(null);
  const [reviews, setReviews] = useState<PullRequestReview[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "files">("overview");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  const [diffFiles, setDiffFiles] = useState<FileDiff[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<PullRequestAction | null>(null);

  const approvedCount = reviews.filter((review) => review.status === "APPROVED").length;
  const alreadyApproved = reviews.some((review) => review.status === "APPROVED");

  const fetchMyRole = useCallback(async () => {
    if (!slug) {
      return;
    }
    try {
      const response = await connect.get<{ role: string | null }>(`/repositories/${slug}/my-role/`);
      setMyRole(response.data.role);
    } catch (fetchError) {
      errorToast(fetchError, "Failed to fetch your role");
    }
  }, [slug]);

  const fetchPR = useCallback(async () => {
    if (!slug || !id) {
      return;
    }
    try {
      const response = await connect.get<PullRequestDetail>(
        `/repositories/${slug}/pull-requests/${id}/`
      );
      setPr(response.data);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load PR."));
    } finally {
      setLoading(false);
    }
  }, [id, slug]);

  const fetchReviews = useCallback(async () => {
    if (!slug || !id) {
      return;
    }
    try {
      const response = await fetchAllPages<PullRequestReview>(
        connect,
        `/repositories/${slug}/pull-requests/${id}/reviews/`
      );
      setReviews(response);
    } catch (fetchError) {
      errorToast(fetchError, "Failed to load reviews");
    }
  }, [id, slug]);

  useEffect(() => {
    if (!slug || !id) {
      setLoading(false);
      setError("Invalid pull request route.");
      return;
    }

    void fetchMyRole();
    void fetchPR();
    void fetchReviews();
  }, [fetchMyRole, fetchPR, fetchReviews, id, slug]);

  useEffect(() => {
    if (activeTab !== "files" || !slug || !id || !pr) {
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollDiff = async (attempt: number) => {
      if (isCancelled) {
        return;
      }

      setDiffLoading(true);

      try {
        const response = await connect.get<DiffResponsePayload>(
          `/repositories/${slug}/pull-requests/${id}/diff/`
        );

        if (isCancelled) {
          return;
        }

        const payload = response.data;
        const isArrayPayload = Array.isArray(payload);
        const status = isArrayPayload ? undefined : payload.status;

        if (status === "processing") {
          if (attempt < MAX_DIFF_POLL_ATTEMPTS) {
            timeoutId = setTimeout(() => {
              void pollDiff(attempt + 1);
            }, DIFF_POLL_INTERVAL_MS);
          } else {
            setError("Diff calculation is taking too long. Please refresh later.");
            setDiffLoading(false);
          }
          return;
        }

        if (isArrayPayload) {
          setDiffFiles(payload);
        } else {
          setDiffFiles(normalizeListResponse<FileDiff>(payload));
        }
      } catch (fetchError) {
        if (!isCancelled) {
          errorToast(fetchError, "Failed to load diff");
        }
      } finally {
        if (!isCancelled) {
          setDiffLoading(false);
        }
      }
    };

    void pollDiff(0);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeTab, id, pr, slug]);

  const handleAction = useCallback(
    async (action: "close" | "reopen") => {
      if (!slug || !id) {
        return;
      }

      setActionLoading(action);
      setError(null);

      try {
        await connect.post(`/repositories/${slug}/pull-requests/${id}/${action}/`);
        await fetchPR();
        successToast(`Pull request ${action === "close" ? "closed" : "reopened"} successfully`);
      } catch (actionError) {
        const errorMsg = getApiErrorMessage(actionError, `Failed to ${action} pull request.`);
        setError(errorMsg);
        errorToast(actionError, errorMsg);
      } finally {
        setActionLoading(null);
      }
    },
    [fetchPR, id, slug]
  );

  const confirmMerge = useCallback(async () => {
    if (!slug || !id) {
      return;
    }

    setActionLoading("merge");
    setMergeModalOpen(false);
    setError(null);

    const previousStatus = pr?.status;
    setPr((previous) => (previous ? { ...previous, status: "MERGED" } : null));

    try {
      await connect.post(`/repositories/${slug}/pull-requests/${id}/merge/`);
      await fetchPR();
      successToast("Pull request merged successfully!");
    } catch (actionError) {
      setPr((previous) =>
        previous && previousStatus ? { ...previous, status: previousStatus } : null
      );
      const errorMsg = getApiErrorMessage(actionError, "Failed to merge pull request.");
      setError(errorMsg);
      errorToast(actionError, errorMsg);
    } finally {
      setActionLoading(null);
    }
  }, [fetchPR, id, pr?.status, slug]);

  const handleApprove = useCallback(async () => {
    if (!slug || !id) {
      return;
    }

    setActionLoading("approve");
    setError(null);

    try {
      await connect.post(`/repositories/${slug}/pull-requests/${id}/reviews/`, {
        status: "APPROVED",
      });
      await fetchReviews();
      successToast("Pull request approved!");
    } catch (actionError) {
      const errorMsg = getApiErrorMessage(actionError, "Failed to approve.");
      setError(errorMsg);
      errorToast(actionError, errorMsg);
    } finally {
      setActionLoading(null);
    }
  }, [fetchReviews, id, slug]);

  if (!pr && loading && !error) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading pull request...</span>
      </div>
    );
  }

  if (error && !pr) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="w-10 h-10 text-destructive/50" />
        <p className="text-sm">{error}</p>
        <Link className="text-sm text-primary hover:underline flex items-center gap-1" to={`/${slug}/pullrequests`}>
          <ArrowLeft size={14} /> Back to PRs
        </Link>
      </div>
    );
  }

  if (!pr || !slug) {
    return null;
  }

  const isMaintainer = myRole === "admin" || myRole === "maintainer";
  const canApprove = isMaintainer;
  const canMerge = isMaintainer && !pr.has_conflicts && pr.status === "OPEN";

  const statusMeta = getStatusMeta(pr.status);
  const StatusIcon = statusMeta.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-foreground">
      {error && (
        <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-normal text-foreground flex items-center gap-2 leading-tight">
            <span className="font-semibold">{pr.title}</span>
            <span className="text-muted-foreground/60 font-light">#{pr.id}</span>
          </h1>

          <Link
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 border border-border rounded-md px-3 py-1.5 transition-colors bg-card"
            to={`/${slug}/pullrequests`}
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${statusMeta.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusMeta.label}
          </span>
          <span className="ml-1">
            <span className="font-semibold text-foreground">Author</span> wants to merge into{" "}
            <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
              {pr.target_name}
            </span>{" "}
            from{" "}
            <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
              {pr.source_name}
            </span>{" "}
            - opened {dayjs(pr.created_at).fromNow()}
          </span>
        </div>
      </div>

      <div className="border-b border-border mb-6 flex gap-6">
        <button
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          <MessageCircle className="w-4 h-4" />
          Overview
        </button>
        <button
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "files"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
          onClick={() => setActiveTab("files")}
        >
          <FileCode className="w-4 h-4" />
          Files changed
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="border border-border rounded-md overflow-hidden bg-card shadow-sm">
                <div className="bg-muted px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground">
                  Description
                </div>
                <div className="p-4 text-sm text-foreground whitespace-pre-wrap">
                  {pr.description || (
                    <span className="text-muted-foreground italic">No description provided.</span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Discussion</h3>
                <CommentList model="pullrequest" myRole={myRole} objectId={pr.id} slug={slug} />
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <DiffFilesPanel
              diffFiles={diffFiles}
              diffLoading={diffLoading}
              myRole={myRole}
              prId={pr.id}
              slug={slug}
            />
          )}
        </div>

        <ActionsSidebar
          actionLoading={actionLoading}
          alreadyApproved={alreadyApproved}
          approvedCount={approvedCount}
          canApprove={canApprove}
          canMerge={canMerge}
          isMaintainer={isMaintainer}
          onApprove={handleApprove}
          onClose={() => {
            void handleAction("close");
          }}
          onMerge={() => setMergeModalOpen(true)}
          onReopen={() => {
            void handleAction("reopen");
          }}
          pr={pr}
        />
      </div>

      <MergeConfirmationDialog
        onConfirm={() => {
          void confirmMerge();
        }}
        onOpenChange={setMergeModalOpen}
        open={mergeModalOpen}
        sourceBranch={pr.source_name}
        targetBranch={pr.target_name}
      />
    </div>
  );
};

export default PRDetailed;
