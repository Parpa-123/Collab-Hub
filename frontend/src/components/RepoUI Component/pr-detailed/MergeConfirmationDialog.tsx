import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MergeConfirmationDialogProps {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceBranch: string;
  targetBranch: string;
}

export default function MergeConfirmationDialog({
  onConfirm,
  onOpenChange,
  open,
  sourceBranch,
  targetBranch,
}: MergeConfirmationDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="text-foreground">
        <DialogHeader>
          <DialogTitle>Confirm Merge</DialogTitle>
          <DialogDescription>
            Are you sure you want to merge <strong>{sourceBranch}</strong> into{" "}
            <strong>{targetBranch}</strong>? This action will close the pull request.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onConfirm}>
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
