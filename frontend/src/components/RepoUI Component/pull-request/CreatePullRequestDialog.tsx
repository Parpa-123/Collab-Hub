import type { ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch, PullRequestFormState } from "./types";

interface CreatePullRequestDialogProps {
  branches: Branch[];
  form: PullRequestFormState;
  formError: string | null;
  onCreate: () => void;
  onFormChange: (updates: Partial<PullRequestFormState>) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  submitting: boolean;
}

export default function CreatePullRequestDialog({
  branches,
  form,
  formError,
  onCreate,
  onFormChange,
  onOpenChange,
  open,
  submitting,
}: CreatePullRequestDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open a pull request</DialogTitle>
          <DialogDescription>Choose branches and describe your changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Source branch
              </label>
              <Select
                onValueChange={(value) => onFormChange({ source_branch: value })}
                value={form.source_branch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Target branch
              </label>
              <Select
                onValueChange={(value) => onFormChange({ target_branch: value })}
                value={form.target_branch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
            <Input
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFormChange({ title: event.target.value })
              }
              placeholder="PR title"
              value={form.title}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Description (optional)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onFormChange({ description: event.target.value })
              }
              placeholder="Describe your changes..."
              rows={3}
              value={form.description}
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={submitting}
              onClick={onCreate}
            >
              {submitting ? "Creating..." : "Create pull request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
