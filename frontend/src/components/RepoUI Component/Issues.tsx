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
  status: "open" | "in_progress" | "closed" | string;
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

  // ---- Label dialog state ----
  const [labelDialogOpen, setLabelDialogOpen] = React.useState(false);
  const [creatingLabel, setCreatingLabel] = React.useState(false);
  const [editingLabel, setEditingLabel] = React.useState<Label | null>(null);
  const [newLabel, setNewLabel] = React.useState({
    name: "",
    color: "000000",
    description: "",
  });

  // Fetch issues + labels (repo-level labels)
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [issuesRes, labelsRes] = await Promise.all([
          connect.get(`/repositories/${slug}/issues/`),
          connect.get(`/repositories/${slug}/labels/`),
        ]);

        setIssues(issuesRes.data);
        setLabels(labelsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  // Filter issues based on search params
  const filteredIssues = useMemo(() => {
    if (currentFilter === "is:closed") {
      return issues.filter((i) => i.status === "closed");
    }
    // Default to open
    return issues.filter((i) => i.status === "open");
  }, [issues, currentFilter]);

  // Counts for tabs
  const openCount = issues.filter((i) => i.status === "open").length;
  const closedCount = issues.filter((i) => i.status === "closed").length;

  const handleCreateIssue = async () => {
    if (!title.trim()) return;

    try {
      setCreatingIssue(true);

      const payload = {
        title,
        description,
        status,
        parent: parent ? Number(parent) : null,
        label_ids: selectedLabels,
      };

      const res = await connect.post(
        `/repositories/${slug}/issues/`,
        payload
      );
      setIssues((prev) => [res.data, ...prev]);

      setTitle("");
      setDescription("");
      setStatus("open");
      setParent("");
      setSelectedLabels([]);
      setIssueDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to create issue:", error.response?.data || error);
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
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await connect.delete(`/repositories/${slug}/issues/${id}/`);
      setIssues((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error("Error deleting issue:", error);
    }
  };

  // ---- CREATE / UPDATE LABEL (repo-level) ----
  const handleSaveLabel = async () => {
    if (!newLabel.name.trim()) return;

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

      // reset
      setEditingLabel(null);
      setNewLabel({ name: "", color: "000000", description: "" });
      // Keep dialog open for management
    } catch (error: any) {
      console.error("Failed to save label:", error.response?.data || error);
    } finally {
      setCreatingLabel(false);
    }
  };


  const handleDeleteLabel = async (id: number) => {
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

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchParams({ q: "is:open" })}
            className={`flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium ${currentFilter === "is:open" ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
              }`}
          >
            <Circle size={14} className="text-green-500 fill-green-500" />
            Open <span className="ml-1">{openCount}</span>
          </button>

          <button
            onClick={() => setSearchParams({ q: "is:closed" })}
            className={`px-4 py-2 border rounded-md text-sm font-medium text-gray-600 ${currentFilter === "is:closed" ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
              }`}
          >
            Closed {closedCount}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* New Label Dialog */}
          <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Tag size={16} /> New Label
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Labels</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* List of existing labels */}
                <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                  {labels.length === 0 && <p className="text-sm text-gray-500 text-center">No labels yet.</p>}
                  {labels.map(label => (
                    <div key={label.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: `#${label.color}` }}
                        />
                        <span className="text-sm font-medium">{label.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditLabel(label)} className="p-1 hover:bg-gray-200 rounded">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteLabel(label.id)} className="p-1 hover:bg-red-100 text-red-500 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">
                    {editingLabel ? "Edit Label" : "Create New Label"}
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Name</label>
                        <Input
                          placeholder="bug"
                          value={newLabel.name}
                          onChange={(e) =>
                            setNewLabel((p) => ({ ...p, name: e.target.value }))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Color (hex)</label>
                        <div className="flex gap-2">
                          <span
                            className="w-8 h-8 rounded border flex-shrink-0"
                            style={{ backgroundColor: `#${newLabel.color}` }}
                          />
                          <Input
                            placeholder="ff0000"
                            value={newLabel.color}
                            onChange={(e) =>
                              setNewLabel((p) => ({ ...p, color: e.target.value }))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Description</label>
                      <Input
                        placeholder="Description"
                        value={newLabel.description}
                        onChange={(e) =>
                          setNewLabel((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      {editingLabel && (
                        <Button variant="ghost" size="sm" onClick={cancelEditLabel}>
                          Cancel Edit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSaveLabel}
                        disabled={creatingLabel || !newLabel.name.trim()}
                      >
                        {creatingLabel ? "Saving..." : editingLabel ? "Update Label" : "Create Label"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setLabelDialogOpen(false)}
                >
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleOpenCreateDialog}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus size={16} />
                New Issue
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a new issue</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Issue title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe the issue…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      setStatus(v as "open" | "closed")
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
                </div>

                {/* Parent Issue */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Parent Issue (optional)
                  </label>
                  <Input
                    placeholder="e.g. 12"
                    value={parent}
                    onChange={(e) => setParent(e.target.value)}
                  />
                </div>

                {/* Labels Picker */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => {
                      const selected = selectedLabels.includes(label.id);

                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() =>
                            setSelectedLabels((prev) =>
                              prev.includes(label.id)
                                ? prev.filter((id) => id !== label.id)
                                : [...prev, label.id]
                            )
                          }
                          className={`px-2 py-1 text-xs rounded-full text-white ${selected ? "ring-2 ring-black" : ""
                            }`}
                          style={{ backgroundColor: `#${label.color}` }}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIssueDialogOpen(false)}
                  disabled={creatingIssue}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateIssue}
                  disabled={creatingIssue || !title.trim()}
                >
                  {creatingIssue ? "Creating..." : "Create issue"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Issues List */}
      <div className="border border-gray-200 rounded-lg">
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
