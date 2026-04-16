import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import connect from "../../axios/connect";
import { fetchAllPages } from "@/lib/pagination";
import { Circle } from "lucide-react";
import IssueList from "./IssueList";
import LabelManagerDialog from "./LabelManagerDialog";
import CreateIssueDialog from "./CreateIssueDialog";
import { errorToast, successToast } from "../../lib/toast";

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

const Issues = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilter = searchParams.get("q") || "is:open";

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

  // ---------------- FETCH DATA ----------------
  React.useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        const [issueList, labelList] = await Promise.all([
          fetchAllPages<Issue>(connect, `/repositories/${slug}/issues/`),
          fetchAllPages<Label>(connect, `/repositories/${slug}/labels/`),
        ]);

        setIssues(issueList);
        setLabels(labelList);
      } catch (error) {
        errorToast(error, "Failed to load issues and labels");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // ---------------- FILTER ----------------
  const filteredIssues = useMemo(() => {
    if (currentFilter === "is:closed") {
      return issues.filter((i) => i.status === "closed");
    }
    return issues.filter((i) => i.status === "open");
  }, [issues, currentFilter]);

  const openCount = issues.filter((i) => i.status === "open").length;
  const closedCount = issues.filter((i) => i.status === "closed").length;

  // ---------------- ISSUE ACTIONS ----------------
  const handleCreateIssue = async () => {
    if (!title.trim() || !slug) return;

    try {
      setCreatingIssue(true);

      const payload = {
        title,
        description,
        status,
        parent: parent ? Number(parent) : null,
        label_ids: selectedLabels,
      };

      const res = await connect.post(`/repositories/${slug}/issues/`, payload);

      setIssues((prev) => [res.data, ...prev]);

      setTitle("");
      setDescription("");
      setStatus("open");
      setParent("");
      setSelectedLabels([]);
      setIssueDialogOpen(false);
      successToast("Issue created successfully!");
    } catch (error) {
      errorToast(error, "Failed to create issue");
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleDeleteIssue = async (id: number) => {
    if (!slug) return;

    try {
      await connect.delete(`/repositories/${slug}/issues/${id}/`);
      setIssues((prev) => prev.filter((i) => i.id !== id));
      successToast("Issue deleted successfully!");
    } catch (error) {
      errorToast(error, "Failed to delete issue");
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

  // ---------------- LABEL ACTIONS ----------------
  const handleSaveLabel = async () => {
    if (!newLabel.name.trim() || !slug) return;

    try {
      if (editingLabel) {
        const res = await connect.patch(
          `/repositories/${slug}/labels/${editingLabel.id}/`,
          newLabel
        );

        setLabels((prev) =>
          prev.map((l) => (l.id === editingLabel.id ? res.data : l))
        );
      } else {
        const res = await connect.post(
          `/repositories/${slug}/labels/`,
          newLabel
        );

        setLabels((prev) => [...prev, res.data]);
      }

      setEditingLabel(null);
      setNewLabel({ name: "", color: "000000", description: "" });
      successToast(editingLabel ? "Label updated!" : "Label created!");
    } catch (error: any) {
      errorToast(error, "Failed to save label");
    }
  };

  const handleDeleteLabel = async (id: number) => {
    if (!slug) return;
    if (!window.confirm("Are you sure you want to delete this label?")) return;

    try {
      await connect.delete(`/repositories/${slug}/labels/${id}/`);

      setLabels((prev) => prev.filter((l) => l.id !== id));

      if (editingLabel?.id === id) {
        setEditingLabel(null);
        setNewLabel({ name: "", color: "000000", description: "" });
      }
      successToast("Label deleted successfully!");
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

  // ---------------- UI ----------------
  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchParams({ q: "is:open" })}
            className={`flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium ${
              currentFilter === "is:open"
                ? "bg-gray-100 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            <Circle size={14} className="text-green-500 fill-green-500" />
            Open <span className="ml-1">{openCount}</span>
          </button>

          <button
            onClick={() => setSearchParams({ q: "is:closed" })}
            className={`px-4 py-2 border rounded-md text-sm font-medium text-gray-600 ${
              currentFilter === "is:closed"
                ? "bg-gray-100 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            Closed {closedCount}
          </button>
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

      {/* LIST */}
      <div className="border rounded-lg">
        <IssueList
          issues={filteredIssues}
          loading={loading}
          onDelete={handleDeleteIssue}
        />
      </div>
    </div>
  );
};

export default Issues;
