import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tag } from "lucide-react";

import connect from "../../axios/connect";
import { fetchAllPages } from "@/lib/pagination";
import { errorToast, successToast } from "../../lib/toast";
import { createIssueRealtimeClient, type IssueRealtimeEvent } from "@/websocket/issuesRealtime";
import LabelManagerDialog from "./LabelManagerDialog";
import CreateIssueDialog from "./CreateIssueDialog";

import type { SearchUser } from "./MainLayout";

export interface Label {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  color: string;
  description: string;
}

export interface Assignee {
  id: number;
  created_at: string;
  updated_at: string;
  assigned_at: string;
  issue: number;
  assignee: number;
}

export interface Issue {
  id: number;
  repo: number;
  title: string;
  description: string;
  updated_at: string;
  created_at: string;
  parent: number | null;
  creator: SearchUser;
  status: "open" | "in_progress" | "closed";
  labels: Label[];
  assignees: any[];
}

const ISSUE_COLUMNS: Array<{ key: Issue["status"]; label: string }> = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "closed", label: "Closed" },
];

const issueSort = (a: Issue, b: Issue) =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

const IssueCard = ({ issue, onDelete }: { issue: Issue; onDelete: (id: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(issue.id),
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-md border border-border bg-card p-3 shadow-sm ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link className="text-sm font-semibold hover:text-primary" to={`${issue.id}`}>
          {issue.title}
        </Link>
        <button
          aria-label={`Delete issue ${issue.id}`}
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(issue.id)}
          type="button"
        >
          Delete
        </button>
      </div>

      {issue.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {issue.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: `#${label.color}` }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mb-2 text-xs text-muted-foreground">
        #{issue.id} by{" "}
        {issue.creator?.first_name || issue.creator?.last_name
          ? `${issue.creator.first_name} ${issue.creator.last_name}`.trim()
          : issue.creator?.email || "Unknown"}
      </div>

      <button
        className="rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
        type="button"
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
    </article>
  );
};

const IssueColumn = ({
  column,
  issues,
  onDelete,
}: {
  column: { key: Issue["status"]; label: string };
  issues: Issue[];
  onDelete: (id: number) => void;
}) => {
  const droppableId = `column-${column.key}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <section className="flex min-h-[420px] flex-col rounded-lg border border-border bg-muted/20 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{column.label}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {issues.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-[360px] flex-1 flex-col gap-2 rounded-md p-1 ${
          isOver ? "bg-primary/5" : ""
        }`}
      >
        <SortableContext items={issues.map((issue) => String(issue.id))} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard issue={issue} key={issue.id} onDelete={onDelete} />
          ))}
        </SortableContext>

        {issues.length === 0 && (
          <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            Drop issues here
          </div>
        )}
      </div>
    </section>
  );
};

const Issues = () => {
  const { slug } = useParams();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [labels, setLabels] = React.useState<Label[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [issueDialogOpen, setIssueDialogOpen] = React.useState(false);
  const [creatingIssue, setCreatingIssue] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<"open" | "in_progress" | "closed">("open");
  const [parent, setParent] = React.useState<string>("");
  const [selectedLabels, setSelectedLabels] = React.useState<number[]>([]);

  const [labelDialogOpen, setLabelDialogOpen] = React.useState(false);
  const [editingLabel, setEditingLabel] = React.useState<Label | null>(null);
  const [newLabel, setNewLabel] = React.useState({
    name: "",
    color: "000000",
    description: "",
  });

  const applyRealtimeEvent = React.useCallback((evt: IssueRealtimeEvent) => {
    if (!evt.issue && evt.event_type !== "issue_deleted") {
      return;
    }

    setIssues((prev) => {
      if (evt.event_type === "issue_deleted") {
        return evt.issue ? prev.filter((item) => item.id !== evt.issue!.id) : prev;
      }

      const nextIssue = evt.issue as Issue;
      const exists = prev.some((item) => item.id === nextIssue.id);
      if (!exists) {
        return [nextIssue, ...prev].sort(issueSort);
      }
      return prev
        .map((item) => (item.id === nextIssue.id ? nextIssue : item))
        .sort(issueSort);
    });
  }, []);

  React.useEffect(() => {
    if (!slug) {
      return;
    }

    const fetchData = async () => {
      try {
        const [issueList, labelList] = await Promise.all([
          fetchAllPages<Issue>(connect, `/repositories/${slug}/issues/`),
          fetchAllPages<Label>(connect, `/repositories/${slug}/labels/`),
        ]);

        setIssues(issueList.sort(issueSort));
        setLabels(labelList);
      } catch (error) {
        errorToast(error, "Failed to load issues and labels");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [slug]);

  React.useEffect(() => {
    if (!slug) {
      return;
    }

    const client = createIssueRealtimeClient(slug, applyRealtimeEvent);
    client.connect();
    return () => {
      client.disconnect();
    };
  }, [applyRealtimeEvent, slug]);

  const issuesByStatus = useMemo(() => {
    return {
      open: issues.filter((issue) => issue.status === "open").sort(issueSort),
      in_progress: issues.filter((issue) => issue.status === "in_progress").sort(issueSort),
      closed: issues.filter((issue) => issue.status === "closed").sort(issueSort),
    };
  }, [issues]);

  const handleCreateIssue = async () => {
    if (!title.trim() || !slug) {
      return;
    }

    try {
      setCreatingIssue(true);
      const payload = {
        title,
        description,
        status,
        parent: parent ? Number(parent) : null,
        label_ids: selectedLabels,
      };

      const res = await connect.post<Issue>(`/repositories/${slug}/issues/`, payload);
      setIssues((prev) => [res.data, ...prev].sort(issueSort));

      setTitle("");
      setDescription("");
      setStatus("open");
      setParent("");
      setSelectedLabels([]);
      setIssueDialogOpen(false);
      successToast("Issue created successfully.");
    } catch (error) {
      errorToast(error, "Failed to create issue");
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setTitle("");
    setDescription("");
    setStatus("open");
    setParent("");
    setSelectedLabels([]);
    setIssueDialogOpen(true);
  };

  const handleDeleteIssue = async (id: number) => {
    if (!slug) {
      return;
    }
    try {
      await connect.delete(`/repositories/${slug}/issues/${id}/`);
      setIssues((prev) => prev.filter((issue) => issue.id !== id));
      successToast("Issue deleted successfully.");
    } catch (error) {
      errorToast(error, "Failed to delete issue");
    }
  };

  const resolveDropStatus = React.useCallback(
    (overId: string) => {
      if (overId.startsWith("column-")) {
        return overId.replace("column-", "") as Issue["status"];
      }
      const hoveredIssue = issues.find((issue) => String(issue.id) === overId);
      return hoveredIssue?.status ?? null;
    },
    [issues]
  );

  const handleDragEnd = React.useCallback(
    async ({ active, over }: DragEndEvent) => {
      if (!slug || !over) {
        return;
      }

      const issueId = Number(active.id);
      const movingIssue = issues.find((issue) => issue.id === issueId);
      if (!movingIssue) {
        return;
      }

      const targetStatus = resolveDropStatus(String(over.id));
      if (!targetStatus || targetStatus === movingIssue.status) {
        return;
      }

      const previousStatus = movingIssue.status;
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                status: targetStatus,
              }
            : issue
        )
      );

      try {
        const response = await connect.patch<Issue>(
          `/repositories/${slug}/issues/${issueId}/`,
          { status: targetStatus }
        );
        setIssues((prev) =>
          prev
            .map((issue) => (issue.id === issueId ? response.data : issue))
            .sort(issueSort)
        );
      } catch (error) {
        setIssues((prev) =>
          prev
            .map((issue) =>
              issue.id === issueId
                ? {
                    ...issue,
                    status: previousStatus,
                  }
                : issue
            )
            .sort(issueSort)
        );
        errorToast(error, "Failed to move issue");
      }
    },
    [issues, resolveDropStatus, slug]
  );

  const handleSaveLabel = async () => {
    if (!newLabel.name.trim() || !slug) {
      return;
    }

    try {
      if (editingLabel) {
        const res = await connect.patch<Label>(
          `/repositories/${slug}/labels/${editingLabel.id}/`,
          newLabel
        );

        setLabels((prev) =>
          prev.map((label) => (label.id === editingLabel.id ? res.data : label))
        );
      } else {
        const res = await connect.post<Label>(`/repositories/${slug}/labels/`, newLabel);
        setLabels((prev) => [...prev, res.data]);
      }

      setEditingLabel(null);
      setNewLabel({ name: "", color: "000000", description: "" });
      successToast(editingLabel ? "Label updated." : "Label created.");
    } catch (error) {
      errorToast(error, "Failed to save label");
    }
  };

  const handleDeleteLabel = async (id: number) => {
    if (!slug) {
      return;
    }
    if (!window.confirm("Are you sure you want to delete this label?")) {
      return;
    }

    try {
      await connect.delete(`/repositories/${slug}/labels/${id}/`);
      setLabels((prev) => prev.filter((label) => label.id !== id));

      if (editingLabel?.id === id) {
        setEditingLabel(null);
        setNewLabel({ name: "", color: "000000", description: "" });
      }
      successToast("Label deleted successfully.");
    } catch (error) {
      errorToast(error, "Failed to delete label");
    }
  };

  const startEditLabel = (label: Label) => {
    setEditingLabel(label);
    setNewLabel({
      name: label.name,
      color: label.color,
      description: label.description || "",
    });
  };

  const cancelEditLabel = () => {
    setEditingLabel(null);
    setNewLabel({ name: "", color: "000000", description: "" });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 text-foreground">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Issues Board</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {issues.length} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <LabelManagerDialog
            open={labelDialogOpen}
            onOpenChange={setLabelDialogOpen}
            labels={labels}
            editingLabel={editingLabel}
            newLabel={newLabel}
            onNewLabelChange={setNewLabel}
            onSave={handleSaveLabel}
            onDelete={handleDeleteLabel}
            onStartEdit={startEditLabel}
            onCancelEdit={cancelEditLabel}
          />

          <CreateIssueDialog
            open={issueDialogOpen}
            onOpenChange={setIssueDialogOpen}
            title={title}
            onTitleChange={setTitle}
            description={description}
            onDescriptionChange={setDescription}
            status={status}
            onStatusChange={setStatus}
            parent={parent}
            onParentChange={setParent}
            creating={creatingIssue}
            onOpenCreateDialog={handleOpenCreateDialog}
            onCreate={handleCreateIssue}
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading issues...
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ISSUE_COLUMNS.map((column) => (
              <IssueColumn
                key={column.key}
                column={column}
                issues={issuesByStatus[column.key]}
                onDelete={handleDeleteIssue}
              />
            ))}
          </div>
        </DndContext>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Tag size={12} />
        Drag an issue card to move it between columns.
      </div>
    </div>
  );
};

export default Issues;
