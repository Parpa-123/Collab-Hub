import React from "react";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IssueStatus = "open" | "in_progress" | "closed";

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  status: IssueStatus;
  onStatusChange: (value: IssueStatus) => void;
  parent: string;
  onParentChange: (value: string) => void;
  creating: boolean;
  onOpenCreateDialog: () => void;
  onCreate: () => void;
}

const CreateIssueDialog: React.FC<CreateIssueDialogProps> = ({
  open,
  onOpenChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  parent,
  onParentChange,
  creating,
  onOpenCreateDialog,
  onCreate,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onOpenCreateDialog}>
          <Plus size={16} /> New Issue
        </Button>
      </DialogTrigger>

      <DialogContent className="text-foreground">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />

        <MarkdownEditor
          onChange={onDescriptionChange}
          placeholder="Describe the issue..."
          rows={6}
          value={description}
        />

        <Select
          value={status}
          onValueChange={(v: IssueStatus) => onStatusChange(v)}
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
          onChange={(e) => onParentChange(e.target.value)}
        />

        <Button onClick={onCreate}>
          {creating ? "Creating..." : "Create"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CreateIssueDialog;
