import { FileCode, Loader2 } from "lucide-react";
import CommentList from "../../comments/CommentList";
import { getDiffLineClass } from "./helpers";
import type { FileDiff } from "./types";

interface DiffFilesPanelProps {
  diffFiles: FileDiff[];
  diffLoading: boolean;
  myRole: string | null;
  prId: number;
  slug: string;
}

export default function DiffFilesPanel({
  diffFiles,
  diffLoading,
  myRole,
  prId,
  slug,
}: DiffFilesPanelProps) {
  if (diffLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
        <p className="text-sm">Generating diff... this may take a moment.</p>
      </div>
    );
  }

  if (diffFiles.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500 border rounded-md">
        <FileCode className="w-10 h-10 text-[#d0d7de] mx-auto mb-3" />
        <p className="text-sm">No files changed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {diffFiles.map((file) => (
        <div
          className="border border-[#d0d7de] rounded-md overflow-hidden bg-white shadow-sm"
          key={file.file_path}
        >
          <div className="bg-[#f6f8fa] px-4 py-2 border-b border-[#d0d7de] flex items-center justify-between">
            <span className="text-sm font-semibold font-mono text-[#1f2328]">
              {file.file_path}
            </span>
            <div className="text-xs font-mono flex gap-3 text-gray-500">
              <span className="text-green-600">+{file.additions}</span>
              <span className="text-red-600">-{file.deletions}</span>
            </div>
          </div>

          <div className="overflow-x-auto bg-white text-xs font-mono leading-relaxed p-2">
            {file.diff.map((line, lineIndex) => (
              <div className={getDiffLineClass(line)} key={`${file.file_path}-${lineIndex}`}>
                {line || " "}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#d0d7de] bg-white">
            <CommentList
              model="pullrequest"
              myRole={myRole}
              objectId={prId}
              path={file.file_path}
              slug={slug}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
