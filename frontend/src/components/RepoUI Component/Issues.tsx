import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import connect from "../../axios/connect";
import { Circle, Plus, Tag, Pencil, Trash2 } from "lucide-react";
import IssueList from "./IssueList";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [creatingLabel, setCreatingLabel] = React.useState(false);
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
        const [issuesRes, labelsRes] = await Promise.all([
          connect.get(`/repositories/${slug}/issues/`),
          connect.get(`/repositories/${slug}/labels/`),
        ]);

        setIssues(issuesRes.data.results ?? issuesRes.data);
        setLabels(labelsRes.data.results ?? labelsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
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
    } catch (error: any) {
      console.error("Failed to create issue:", error?.response?.data || error);
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleDeleteIssue = async (id: number) => {
    if (!slug) return;

    try {
      await connect.delete(`/repositories/${slug}/issues/${id}/`);
      setIssues((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error("Error deleting issue:", error);
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
      setCreatingLabel(true);

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
    } catch (error: any) {
      console.error("Failed to save label:", error?.response?.data || error);
    } finally {
      setCreatingLabel(false);
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
    } catch (error) {
      console.error("Error deleting label:", error);
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
          {/* LABEL DIALOG */}
          <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag size={16} /> New Label
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Labels</DialogTitle>
              </DialogHeader>

              {/* LABEL LIST */}
              <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                {labels.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    No labels yet.
                  </p>
                )}

                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: `#${label.color}` }}
                      />
                      <span className="text-sm">{label.name}</span>
                    </div>

                    <div className="flex gap-1">
                      <button onClick={() => startEditLabel(label)}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDeleteLabel(label.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* FORM */}
              <div className="space-y-3 mt-4">
                <Input
                  placeholder="Name"
                  value={newLabel.name}
                  onChange={(e) =>
                    setNewLabel((p) => ({ ...p, name: e.target.value }))
                  }
                />

                <Input
                  placeholder="Color"
                  value={newLabel.color}
                  onChange={(e) =>
                    setNewLabel((p) => ({ ...p, color: e.target.value }))
                  }
                />

                <Input
                  placeholder="Description"
                  value={newLabel.description}
                  onChange={(e) =>
                    setNewLabel((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />

                <Button onClick={handleSaveLabel}>
                  {editingLabel ? "Update" : "Create"}
                </Button>

                {editingLabel && (
                  <Button variant="ghost" onClick={cancelEditLabel}>
                    Cancel Edit
                  </Button>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setLabelDialogOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ISSUE DIALOG */}
          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreateDialog}>
                <Plus size={16} /> New Issue
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Issue</DialogTitle>
              </DialogHeader>

              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Select
                value={status}
                onValueChange={(v: "open" | "in_progress" | "closed") =>
                  setStatus(v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Parent Issue"
                value={parent}
                onChange={(e) => setParent(e.target.value)}
              />

              <Button onClick={handleCreateIssue}>
                {creatingIssue ? "Creating..." : "Create"}
              </Button>
            </DialogContent>
          </Dialog>
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