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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // We use FormData to handle multipart form data directly.
    const formData = new FormData();
    formData.append("branch", branch);
    formData.append("message", message);
    
    files.forEach((file) => {
      // Append each file. Using 'files' as key since backend uses `getlist('files')`
      formData.append("files", file, file.name);
    });

    try {
      await connect.post(`/repositories/${slug}/file-upload/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setOpen(false);
      setFiles([]);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        "Failed to upload files. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white hover:bg-gray-100 flex items-center gap-1">
          <Plus size={14} /> Upload Files
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Commit Files</DialogTitle>
          <DialogDescription>
            Upload generic text files directly to your repository via the web.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-3 py-2 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* File input area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer
              ${files.length > 0 ? "border-[#0969da] bg-[#f1f8ff]" : "border-gray-300 hover:bg-gray-50"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className={`w-8 h-8 mb-2 ${files.length > 0 ? "text-[#0969da]" : "text-gray-400"}`} />
            <span className="text-sm font-medium text-gray-700">
              {files.length > 0
                ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                : "Choose files to upload"}
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          {/* List selected files */}
          {files.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 bg-white border rounded">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 border-b last:border-0 text-sm">
                  <span className="truncate text-gray-700 font-mono text-xs">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Commit Message</label>
              <input
                type="text"
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Branch</label>
              <input
                type="text"
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da] bg-gray-50"
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
            className="bg-[#1f883d] hover:bg-[#1a7f37] text-white"
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Commit changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadCommit;
