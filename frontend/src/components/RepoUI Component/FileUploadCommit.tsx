import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, Loader2, X, Plus } from "lucide-react";
import connect from "../../axios/connect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ActionStatusModal, { type StatusType } from "@/components/ui/action-status-modal";

interface FileUploadCommitProps {
  slug: string;
  defaultBranch?: string;
  onSuccess?: () => void;
}

const FileUploadCommit = ({ slug, defaultBranch = "main", onSuccess }: FileUploadCommitProps) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("Add files via upload");
  const [branch, setBranch] = useState(defaultBranch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<StatusType>("idle");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [modalError, setModalError] = useState<string | undefined>(undefined);
  const [modalDetails, setModalDetails] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setBranch(defaultBranch);
  }, [defaultBranch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await connect.get(`/repositories/${slug}/upload-status/${taskId}/`);
      const status = res.data.status?.toUpperCase();
      if (status === "SUCCESS") {
        setLoading(false);
        setModalStatus("success");
        setModalTitle("Commit Successful!");
        setModalDesc(`Committed ${files.length} file(s) to branch "${branch}"`);
        setModalDetails(files.map((f) => f.webkitRelativePath || f.name));
        setFiles([]);
        if (onSuccess) onSuccess();
      } else if (status === "FAILURE") {
        setLoading(false);
        setModalStatus("error");
        setModalTitle("Upload Failed");
        setModalError(res.data.message || "Failed to process files.");
      } else {
        setTimeout(() => pollTaskStatus(taskId), 2000);
      }
    } catch {
      setLoading(false);
      setModalStatus("error");
      setModalTitle("Upload Status Check Failed");
      setModalError("Could not reach backend to verify file upload status.");
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setLoading(true);
    setError(null);

    // Close the input dialog and show the ActionStatusModal
    setOpen(false);
    setModalOpen(true);
    setModalStatus("processing");
    setModalTitle("Uploading & Processing Commit");
    setModalDesc("Creating blob snapshots and committing files to repository...");
    setModalDetails(files.map((f) => f.webkitRelativePath || f.name));
    setModalError(undefined);

    const formData = new FormData();
    formData.append("branch", branch);
    formData.append("message", message);

    files.forEach((file) => {
      formData.append("files", file, file.name);
      formData.append("file_paths", file.webkitRelativePath || file.name);
    });

    try {
      const response = await connect.post(`/repositories/${slug}/async-file-upload/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const taskId = response.data.task_id;
      if (taskId) {
        pollTaskStatus(taskId);
      } else {
        setLoading(false);
        setModalStatus("success");
        setModalTitle("Commit Successful!");
        setModalDesc(`Committed ${files.length} file(s) to branch "${branch}"`);
        setFiles([]);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setLoading(false);
      setModalStatus("error");
      setModalTitle("Commit Error");
      setModalError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to upload files. Please try again."
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="bg-card hover:bg-accent flex items-center gap-1 border-border text-foreground">
            <Plus size={14} /> Upload Files
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Commit Files</DialogTitle>
            <DialogDescription>
              Upload files or directories directly to your repository via the web.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* File and Directory input area */}
            <div className="flex gap-4 w-full">
              <div
                className={`flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer
                  ${files.length > 0 ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className={`w-8 h-8 mb-2 ${files.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium text-foreground text-center">
                  {files.length > 0 ? `${files.length} file(s)` : "Upload Files"}
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div
                className={`flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer
                  ${files.length > 0 ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
                onClick={() => dirInputRef.current?.click()}
              >
                <UploadCloud className={`w-8 h-8 mb-2 ${files.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium text-foreground text-center">
                  Upload Directory
                </span>
                <input
                  type="file"
                  multiple
                  {...({ webkitdirectory: "" } as any)}
                  className="hidden"
                  ref={dirInputRef}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* List selected files */}
            {files.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 bg-muted/50 border border-border rounded">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 border-b border-border last:border-0 text-sm">
                    <span className="truncate text-foreground font-mono text-xs" title={file.webkitRelativePath || file.name}>
                      {file.webkitRelativePath || file.name}
                    </span>
                    <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Commit Message</label>
                <input
                  type="text"
                  className="w-full text-sm border border-border rounded px-3 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Branch</label>
                <input
                  type="text"
                  className="w-full text-sm border border-border rounded px-3 py-1.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-muted text-foreground"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 dark:bg-green-700 hover:opacity-90 text-white"
              onClick={handleSubmit}
              disabled={loading || files.length === 0}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {loading ? "Processing..." : "Commit changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Status Modal for Progress / Success / Error */}
      <ActionStatusModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        status={modalStatus}
        title={modalTitle}
        description={modalDesc}
        errorMessage={modalError}
        details={modalDetails}
        primaryActionLabel={modalStatus === "error" ? "Close" : "Done"}
        onPrimaryAction={() => setModalOpen(false)}
      />
    </>
  );
};

export default FileUploadCommit;
