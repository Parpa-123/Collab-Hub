import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Label } from "../Issues";

type IssueStatus = "open" | "in_progress" | "closed";

interface EditIssueDialogProps {
  editDescription: string;
  editParent: string;
  editSelectedLabels: number[];
  editStatus: IssueStatus;
  editTitle: string;
  labels: Label[];
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  saving: boolean;
  setEditDescription: (value: string) => void;
  setEditParent: (value: string) => void;
  setEditSelectedLabels: (labelIds: number[]) => void;
  setEditStatus: (status: IssueStatus) => void;
  setEditTitle: (value: string) => void;
}

export default function EditIssueDialog({
  editDescription,
  editParent,
  editSelectedLabels,
  editStatus,
  editTitle,
  labels,
  onOpenChange,
  onSubmit,
  open,
  saving,
  setEditDescription,
  setEditParent,
  setEditSelectedLabels,
  setEditStatus,
  setEditTitle,
}: EditIssueDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Issue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <Input
              onChange={(event) => setEditTitle(event.target.value)}
              placeholder="Issue title"
              value={editTitle}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Describe the issue..."
              rows={4}
              value={editDescription}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select onValueChange={(value) => setEditStatus(value as IssueStatus)} value={editStatus}>
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

          <div className="space-y-1">
            <label className="text-sm font-medium">Parent Issue (optional)</label>
            <Input
              onChange={(event) => setEditParent(event.target.value)}
              placeholder="e.g. 12"
              value={editParent}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Labels</label>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const selected = editSelectedLabels.includes(label.id);

                return (
                  <button
                    className={`px-2 py-1 text-xs rounded-full text-white ${
                      selected ? "ring-2 ring-black" : ""
                    }`}
                    key={label.id}
                    onClick={() =>
                      setEditSelectedLabels(
                        selected
                          ? editSelectedLabels.filter((labelId) => labelId !== label.id)
                          : [...editSelectedLabels, label.id]
                      )
                    }
                    style={{ backgroundColor: `#${label.color}` }}
                    type="button"
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button disabled={saving} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={saving || !editTitle.trim()} onClick={onSubmit}>
            {saving ? "Saving..." : "Update Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
