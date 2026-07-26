import React from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

export type StatusType = "idle" | "processing" | "success" | "error";

export interface ActionStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: StatusType;
  title: string;
  description?: string;
  details?: string[];
  errorMessage?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const ActionStatusModal: React.FC<ActionStatusModalProps> = ({
  open,
  onOpenChange,
  status,
  title,
  description,
  details = [],
  errorMessage,
  primaryActionLabel = "OK",
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  if (status === "idle") return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-card text-foreground border-border">
        <DialogHeader className="flex flex-col items-center text-center pt-2">
          {status === "processing" && (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {status === "success" && (
            <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
            </div>
          )}

          {status === "error" && (
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
          )}

          <DialogTitle className="text-lg font-semibold text-foreground">
            {title}
          </DialogTitle>

          {description && (
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Error alert box */}
        {status === "error" && errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md my-2 break-words">
            {errorMessage}
          </div>
        )}

        {/* Detail list if available */}
        {details.length > 0 && (
          <div className="max-h-36 overflow-y-auto bg-muted/50 border border-border rounded-md p-2 space-y-1 text-xs font-mono my-2">
            {details.map((item, idx) => (
              <div key={idx} className="truncate text-muted-foreground" title={item}>
                • {item}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              disabled={status === "processing"}
            >
              {secondaryActionLabel}
            </Button>
          )}

          {onPrimaryAction && (
            <Button
              size="sm"
              className={
                status === "success"
                  ? "bg-green-600 dark:bg-green-700 text-white hover:opacity-90"
                  : status === "error"
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground"
              }
              onClick={onPrimaryAction}
              disabled={status === "processing"}
            >
              {primaryActionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActionStatusModal;
