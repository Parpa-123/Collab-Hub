import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CircleCheck,
  CircleDot,
  Clock,
  Loader2,
  Pencil,
  Tag,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import connect from "../../axios/connect";
import { fetchAllPages } from "@/lib/pagination";
import { errorToast, successToast } from "../../lib/toast";
import type { Issue, Label } from "./Issues";
import EditIssueDialog from "./issue-detail/EditIssueDialog";
import SidebarSection from "./issue-detail/SidebarSection";
import { creatorName, getApiErrorMessage, statusConfig } from "./issue-detail/helpers";

dayjs.extend(relativeTime);

type IssueStatus = Issue["status"];

const IssueDetail = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<IssueStatus>("open");
  const [editParent, setEditParent] = useState("");
  const [editSelectedLabels, setEditSelectedLabels] = useState<number[]>([]);

  const fetchIssueData = useCallback(async () => {
    if (!slug || !id) {
      setLoading(false);
      setError("Invalid issue route.");
      return;
    }

    try {
      setLoading(true);
      const [issueResponse, labelList] = await Promise.all([
        connect.get<Issue>(`/repositories/${slug}/issues/${id}/`),
        fetchAllPages<Label>(connect, `/repositories/${slug}/labels/`),
      ]);

      setIssue(issueResponse.data);
      setLabels(labelList);
      setError(null);
    } catch (fetchError) {
      errorToast(fetchError, "Failed to load issue");
      setError(getApiErrorMessage(fetchError, "Issue not found."));
    } finally {
      setLoading(false);
    }
  }, [id, slug]);

  useEffect(() => {
    void fetchIssueData();
  }, [fetchIssueData]);

  const openEditDialog = useCallback(() => {
    if (!issue) {
      return;
    }
    setEditTitle(issue.title);
    setEditDescription(issue.description || "");
    setEditStatus(issue.status);
    setEditParent(issue.parent ? String(issue.parent) : "");
    setEditSelectedLabels(issue.labels.map((label) => label.id));
    setEditDialogOpen(true);
  }, [issue]);

  const patchIssue = useCallback(
    async (payload: Partial<Pick<Issue, "title" | "description" | "status" | "parent">> & {
      label_ids?: number[];
    }) => {
      if (!slug || !issue) {
        return null;
      }

      const response = await connect.patch<Issue>(
        `/repositories/${slug}/issues/${issue.id}/`,
        payload
      );
      return response.data;
    },
    [issue, slug]
  );

  const handleUpdateIssue = useCallback(async () => {
    if (!issue || !editTitle.trim()) {
      return;
    }

    try {
      setSaving(true);
      const updatedIssue = await patchIssue({
        title: editTitle,
        description: editDescription,
        status: editStatus,
        parent: editParent ? Number(editParent) : null,
        label_ids: editSelectedLabels,
      });

      if (updatedIssue) {
        setIssue(updatedIssue);
        setEditDialogOpen(false);
        successToast("Issue updated successfully!");
      }
    } catch (updateError) {
      errorToast(updateError, "Failed to update issue");
      setError(getApiErrorMessage(updateError, "Failed to update issue."));
    } finally {
      setSaving(false);
    }
  }, [
    editDescription,
    editParent,
    editSelectedLabels,
    editStatus,
    editTitle,
    issue,
    patchIssue,
  ]);

  const handleUpdateStatus = useCallback(
    async (status: IssueStatus) => {
      if (!issue) {
        return;
      }

      try {
        setSaving(true);
        const updatedIssue = await patchIssue({ status });
        if (updatedIssue) {
          setIssue(updatedIssue);
        }
      } catch (statusError) {
        errorToast(statusError, "Failed to update issue status");
        setError(getApiErrorMessage(statusError, "Failed to update issue status."));
      } finally {
        setSaving(false);
      }
    },
    [issue, patchIssue]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading issue...</span>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="w-10 h-10 text-destructive/50" />
        <p className="text-sm">{error || "Issue not found."}</p>
        <Link
          className="text-sm text-primary hover:underline flex items-center gap-1"
          to={`/${slug}/issues`}
        >
          <ArrowLeft size={14} /> Back to issues
        </Link>
      </div>
    );
  }

  const status = statusConfig[issue.status];
  const StatusIcon = status.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-foreground">
      <Link
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-5"
        to={`/${slug}/issues`}
      >
        <ArrowLeft size={14} /> Back to issues
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground leading-snug">
            {issue.title}
            <span className="ml-2 text-muted-foreground font-normal">#{issue.id}</span>
          </h1>

          <div className="flex items-center gap-2">
            <Button
              className="flex items-center gap-1.5 shrink-0"
              disabled={saving}
              onClick={openEditDialog}
              size="sm"
              variant="outline"
            >
              <Pencil size={14} />
              Edit
            </Button>

            {issue.status !== "closed" && (
              <Button
                className="flex items-center gap-1.5 shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                disabled={saving}
                onClick={() => {
                  void handleUpdateStatus("closed");
                }}
                size="sm"
                variant="outline"
              >
                <CircleCheck size={14} />
                Close issue
              </Button>
            )}

            {issue.status === "closed" && (
              <Button
                className="flex items-center gap-1.5 shrink-0 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                disabled={saving}
                onClick={() => {
                  void handleUpdateStatus("open");
                }}
                size="sm"
                variant="outline"
              >
                <CircleDot size={14} />
                Reopen
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border ${status.bg} ${status.color}`}
          >
            <StatusIcon size={14} />
            {status.label}
          </span>

          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{creatorName(issue.creator)}</span> opened
            this issue {dayjs(issue.created_at).fromNow()}
          </span>
        </div>
      </div>

      <hr className="border-border mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
        <div>
          <div className="border border-border rounded-lg bg-card">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-t-lg border-b border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                {issue.creator?.first_name?.[0] ?? issue.creator?.email?.[0] ?? "?"}
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {creatorName(issue.creator)}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  commented {dayjs(issue.created_at).fromNow()}
                </span>
              </div>
            </div>

            <div className="px-4 py-5 text-sm text-foreground leading-relaxed min-h-[80px]">
              {issue.description ? (
                <p className="whitespace-pre-wrap">{issue.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </div>

          {issue.updated_at && issue.updated_at !== issue.created_at && (
            <div className="flex items-center gap-2 mt-5 text-xs text-muted-foreground">
              <Clock size={12} />
              Last updated {dayjs(issue.updated_at).fromNow()}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <SidebarSection icon={<User size={14} />} title="Assignees">
            {issue.assignees.length === 0 ? (
              <p className="text-xs text-muted-foreground">No one assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {issue.assignees.map((assignee: { id: number; assignee: number }) => (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground"
                    key={assignee.id}
                  >
                    <User size={10} />
                    Assignee #{assignee.assignee}
                  </span>
                ))}
              </div>
            )}
          </SidebarSection>

          <SidebarSection icon={<Tag size={14} />} title="Labels">
            {issue.labels.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {issue.labels.map((label) => (
                  <span
                    className="px-2.5 py-0.5 text-xs font-medium rounded-full text-white"
                    key={label.id}
                    style={{ backgroundColor: `#${label.color}` }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}
          </SidebarSection>

          <SidebarSection icon={<Calendar size={14} />} title="Timeline">
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Created {dayjs(issue.created_at).format("MMM D, YYYY h:mm A")}
              </li>
              {issue.updated_at && issue.updated_at !== issue.created_at && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  Updated {dayjs(issue.updated_at).format("MMM D, YYYY h:mm A")}
                </li>
              )}
            </ul>
          </SidebarSection>

          {issue.parent && (
            <SidebarSection icon={<CircleDot size={14} />} title="Parent Issue">
              <Link className="text-xs text-primary hover:underline" to={`/${slug}/issues/${issue.parent}`}>
                Issue #{issue.parent}
              </Link>
            </SidebarSection>
          )}
        </aside>
      </div>

      <EditIssueDialog
        editDescription={editDescription}
        editParent={editParent}
        editSelectedLabels={editSelectedLabels}
        editStatus={editStatus}
        editTitle={editTitle}
        labels={labels}
        onOpenChange={setEditDialogOpen}
        onSubmit={() => {
          void handleUpdateIssue();
        }}
        open={editDialogOpen}
        saving={saving}
        setEditDescription={setEditDescription}
        setEditParent={setEditParent}
        setEditSelectedLabels={setEditSelectedLabels}
        setEditStatus={setEditStatus}
        setEditTitle={setEditTitle}
      />
    </div>
  );
};

export default IssueDetail;
