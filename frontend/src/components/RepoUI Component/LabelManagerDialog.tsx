import React from "react";
import { Tag, Pencil, Trash2 } from "lucide-react";
import type { Label } from "./Issues";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LabelManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: Label[];
  editingLabel: Label | null;
  newLabel: { name: string; color: string; description: string };
  onNewLabelChange: (label: { name: string; color: string; description: string }) => void;
  onSave: () => void;
  onDelete: (id: number) => void;
  onStartEdit: (label: Label) => void;
  onCancelEdit: () => void;
}

const LabelManagerDialog: React.FC<LabelManagerDialogProps> = ({
  open,
  onOpenChange,
  labels,
  editingLabel,
  newLabel,
  onNewLabelChange,
  onSave,
  onDelete,
  onStartEdit,
  onCancelEdit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <button onClick={() => onStartEdit(label)}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => onDelete(label.id)}>
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
              onNewLabelChange({ ...newLabel, name: e.target.value })
            }
          />

          <Input
            placeholder="Color"
            value={newLabel.color}
            onChange={(e) =>
              onNewLabelChange({ ...newLabel, color: e.target.value })
            }
          />

          <Input
            placeholder="Description"
            value={newLabel.description}
            onChange={(e) =>
              onNewLabelChange({ ...newLabel, description: e.target.value })
            }
          />

          <Button onClick={onSave}>
            {editingLabel ? "Update" : "Create"}
          </Button>

          {editingLabel && (
            <Button variant="ghost" onClick={onCancelEdit}>
              Cancel Edit
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelManagerDialog;
