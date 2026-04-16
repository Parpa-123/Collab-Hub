import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import connect from "../../axios/connect";
import { errorToast } from "../../lib/toast";
import { Folder, FileText, ChevronRight, CornerLeftUp } from "lucide-react";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface TreeResponse {
  branch: string;
  commit_id: string;
  files: FileNode[];
}

interface FileExplorerProps {
  slug: string;
  branch?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ slug, branch }) => {
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitId, setCommitId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");

  const fetchTree = async (path: string = "") => {
    setLoading(true);
    try {
      const res = await connect.get<TreeResponse>(
        `/repositories/${slug}/tree/`,
        { params: { branch, path } }
      );
      // Sort: directories first, then files, alphabetically within each group
      const sorted = [...(res.data.files || [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(sorted);
      setCommitId(res.data.commit_id || null);
      setCurrentPath(path);
    } catch (error) {
      errorToast(error, "Failed to load directory");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchTree("");
    }
  }, [slug, branch]);

  const handleClick = (node: FileNode) => {
    if (node.type === "dir") {
      // Drill into the directory
      fetchTree(node.path);
    } else {
      // Navigate to the file viewer
      navigate(
        `/${slug}/blob?path=${encodeURIComponent(node.path)}&branch=${encodeURIComponent(branch || "main")}`
      );
    }
  };

  const handleGoUp = () => {
    // Go up one directory level
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    fetchTree(parts.join("/"));
  };

  /* ── Breadcrumb segments for current path ── */
  const pathSegments = currentPath.split("/").filter(Boolean);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center animate-pulse">
        Loading files...
      </div>
    );
  }

  if (files.length === 0 && !currentPath) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No files found for this branch.</p>
        <p className="text-xs text-gray-400 mt-1">
          Upload files to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Latest commit info banner ── */}
      <div className="bg-gray-50 px-4 py-2.5 text-sm border-b border-gray-200 flex items-center justify-between">
        <span className="text-gray-600 font-mono text-xs">
          {commitId ? commitId.slice(0, 7) : "—"} on{" "}
          <span className="font-medium text-gray-800">{branch || "main"}</span>
        </span>

        {/* Path breadcrumbs */}
        {pathSegments.length > 0 && (
          <nav className="flex items-center gap-1 text-xs">
            <button
              onClick={() => fetchTree("")}
              className="text-blue-600 hover:underline font-medium"
            >
              root
            </button>
            {pathSegments.map((seg, idx) => {
              const isLast = idx === pathSegments.length - 1;
              const partialPath = pathSegments.slice(0, idx + 1).join("/");
              return (
                <span key={partialPath} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  {isLast ? (
                    <span className="text-gray-800 font-medium">{seg}</span>
                  ) : (
                    <button
                      onClick={() => fetchTree(partialPath)}
                      className="text-blue-600 hover:underline"
                    >
                      {seg}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      {/* ── Go up row ── */}
      {currentPath && (
        <button
          onClick={handleGoUp}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-b border-gray-200 transition-colors"
        >
          <CornerLeftUp className="w-4 h-4" />
          <span>..</span>
        </button>
      )}

      {/* ── File list ── */}
      <div className="divide-y divide-gray-100">
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => handleClick(file)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left group"
          >
            {file.type === "dir" ? (
              <Folder className="w-4 h-4 text-blue-500 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            <span
              className={`text-sm ${
                file.type === "dir"
                  ? "text-gray-900 font-medium"
                  : "text-gray-700"
              } group-hover:text-blue-600 group-hover:underline`}
            >
              {file.name || file.path}
            </span>

            {file.type === "dir" && (
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
