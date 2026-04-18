import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  GitMerge,
  GitPullRequest,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import connect from "../../axios/connect";
import { errorToast } from "../../lib/toast";
import { fetchAllPages } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import CreatePullRequestDialog from "./pull-request/CreatePullRequestDialog";
import PullRequestRow from "./pull-request/PullRequestRow";
import type {
  Branch,
  PullRequest,
  PullRequestAction,
  PullRequestFormState,
  Review,
} from "./pull-request/types";

const STATUS_FILTERS: PullRequest["status"][] = ["OPEN", "CLOSED", "MERGED"];

const INITIAL_FORM: PullRequestFormState = {
  title: "",
  description: "",
  source_branch: "",
  target_branch: "",
};

function getStatusBadgeClass(status: PullRequest["status"]) {
  switch (status) {
    case "OPEN":
      return "bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20";
    case "CLOSED":
      return "bg-destructive/10 text-destructive border border-destructive/20";
    case "MERGED":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-500 border border-purple-500/20";
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const maybeError = error as {
    message?: string;
    response?: { data?: unknown };
  };

  const responseData = maybeError.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const data = responseData as Record<string, unknown>;
    const nonFieldErrors = data.non_field_errors;

    if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === "string") {
      return nonFieldErrors[0];
    }
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (typeof data.error === "string") {
      return data.error;
    }

    const firstValue = Object.values(data)[0];
    if (typeof firstValue === "string") {
      return firstValue;
    }
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
  }

  if (typeof maybeError.message === "string" && maybeError.message.trim()) {
    return maybeError.message;
  }

  return fallback;
}

const PullRequests = () => {
  const { slug } = useParams<{ slug: string }>();

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filter, setFilter] = useState<PullRequest["status"]>("OPEN");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);

  const [reviewsMap, setReviewsMap] = useState<Record<number, Review[]>>({});
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [expandedPrId, setExpandedPrId] = useState<number | null>(null);

  const [form, setForm] = useState<PullRequestFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPullRequests = useCallback(async () => {
    if (!slug) {
      return;
    }

    try {
      const response = await fetchAllPages<PullRequest>(
        connect,
        `/repositories/${slug}/pull-requests/`
      );
      setPullRequests(response);
    } catch (error) {
      errorToast(error, "Failed to load pull requests");
    }
  }, [slug]);

  const fetchBranches = useCallback(async () => {
    if (!slug) {
      return;
    }

    try {
      const response = await fetchAllPages<Branch>(
        connect,
        `/repositories/${slug}/branches/`
      );
      setBranches(response);
    } catch (error) {
      errorToast(error, "Failed to load branches");
    }
  }, [slug]);

  const fetchMyRole = useCallback(async () => {
    if (!slug) {
      return;
    }

    try {
      const response = await connect.get<{ role: string | null }>(
        `/repositories/${slug}/my-role/`
      );
      setMyRole(response.data.role);
    } catch (error) {
      errorToast(error, "Failed to load your role");
    }
  }, [slug]);

  const fetchReviews = useCallback(
    async (prId: number) => {
      if (!slug) {
        return;
      }

      try {
        const response = await fetchAllPages<Review>(
          connect,
          `/repositories/${slug}/pull-requests/${prId}/reviews/`
        );
        setReviewsMap((previous) => ({
          ...previous,
          [prId]: response,
        }));
      } catch (error) {
        errorToast(error, `Failed to load reviews for PR`);
      }
    },
    [slug]
  );

  useEffect(() => {
    void fetchPullRequests();
    void fetchBranches();
    void fetchMyRole();
  }, [fetchPullRequests, fetchBranches, fetchMyRole]);

  useEffect(() => {
    pullRequests
      .filter((pullRequest) => pullRequest.status === "OPEN")
      .forEach((pullRequest) => {
        void fetchReviews(pullRequest.id);
      });
  }, [pullRequests, fetchReviews]);

  const statusCounts = useMemo(() => {
    return pullRequests.reduce<Record<PullRequest["status"], number>>(
      (counts, pullRequest) => {
        counts[pullRequest.status] += 1;
        return counts;
      },
      { OPEN: 0, CLOSED: 0, MERGED: 0 }
    );
  }, [pullRequests]);

  const filteredPullRequests = useMemo(() => {
    const query = search.toLowerCase();

    return pullRequests
      .filter((pullRequest) => pullRequest.status === filter)
      .filter(
        (pullRequest) =>
          pullRequest.title.toLowerCase().includes(query) ||
          pullRequest.source_name?.toLowerCase().includes(query)
      );
  }, [pullRequests, filter, search]);

  const canApprove = myRole === "admin" || myRole === "maintainer";

  const statusBadge = useCallback((status: PullRequest["status"]) => {
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadgeClass(status)}`}>
        {status}
      </span>
    );
  }, []);

  const handleApprove = useCallback(
    async (prId: number) => {
      if (!slug) {
        return;
      }

      setActionError(null);
      setApprovingId(prId);

      try {
        await connect.post(`/repositories/${slug}/pull-requests/${prId}/reviews/`, {
          status: "APPROVED",
        });
        await fetchReviews(prId);
      } catch (error) {
        setActionError(getErrorMessage(error, "Failed to approve."));
      } finally {
        setApprovingId(null);
      }
    },
    [fetchReviews, slug]
  );

  const handleAction = useCallback(
    async (prId: number, action: PullRequestAction) => {
      if (!slug) {
        return;
      }

      setActionError(null);
      try {
        await connect.post(`/repositories/${slug}/pull-requests/${prId}/${action}/`);
        await fetchPullRequests();
      } catch (error) {
        setActionError(
          getErrorMessage(error, `Failed to ${action} pull request.`)
        );
      }
    },
    [fetchPullRequests, slug]
  );

  const handleCreate = useCallback(async () => {
    if (!slug) {
      return;
    }

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
      setForm(INITIAL_FORM);
      await fetchPullRequests();
    } catch (error) {
      setFormError(getErrorMessage(error, "Failed to create pull request."));
    } finally {
      setSubmitting(false);
    }
  }, [fetchPullRequests, form, slug]);

  const handleFormChange = useCallback(
    (updates: Partial<PullRequestFormState>) => {
      setForm((previous) => ({ ...previous, ...updates }));
    },
    []
  );

  const toggleComments = useCallback((prId: number) => {
    setExpandedPrId((current) => (current === prId ? null : prId));
  }, []);

  if (!slug) {
    return (
      <div className="px-6 py-6 bg-muted/30 min-h-full">
        <div className="border border-border rounded-md bg-card px-4 py-6 text-sm text-muted-foreground">
          Repository slug is missing from the URL.
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 bg-muted/30 min-h-full font-sans text-foreground">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Pull Requests</h2>
          <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/20">
            {statusCounts.OPEN} open
          </span>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setShowCreate(true)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          New pull request
        </Button>
      </div>

      {actionError && (
        <div className="mb-3 px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
          {actionError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center border border-border rounded-md bg-card px-3 py-2 flex-1 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground/50"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pull requests..."
            value={search}
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors ${
                filter === status
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
              key={status}
              onClick={() => setFilter(status)}
            >
              {status === "OPEN" && <GitPullRequest className="w-3.5 h-3.5" />}
              {status === "MERGED" && <GitMerge className="w-3.5 h-3.5" />}
              {status === "CLOSED" && <XCircle className="w-3.5 h-3.5" />}
              {status} ({statusCounts[status]})
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
          {filteredPullRequests.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground">
              <GitPullRequest className="w-10 h-10 text-border mx-auto mb-3" />
              <p className="text-sm">
                No {filter.toLowerCase()} pull requests found.
              </p>
            </div>
          ) : (
            filteredPullRequests.map((pullRequest) => (
              <PullRequestRow
                approvingId={approvingId}
                canApprove={canApprove}
                isExpanded={expandedPrId === pullRequest.id}
                key={pullRequest.id}
                myRole={myRole}
                onAction={handleAction}
                onApprove={handleApprove}
                onToggleComments={toggleComments}
                pr={pullRequest}
                reviews={reviewsMap[pullRequest.id] ?? []}
                slug={slug}
                statusBadge={statusBadge}
              />
            ))
          )}
        </div>
      </div>

      <CreatePullRequestDialog
        branches={branches}
        form={form}
        formError={formError}
        onCreate={handleCreate}
        onFormChange={handleFormChange}
        onOpenChange={setShowCreate}
        open={showCreate}
        submitting={submitting}
      />
    </div>
  );
};

export default PullRequests;
