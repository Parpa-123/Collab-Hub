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
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
        <p className="text-sm">Generating diff... this may take a moment.</p>
      </div>
    );
  }

  if (diffFiles.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground border border-border rounded-md bg-card/10">
        <FileCode className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm">No files changed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {diffFiles.map((file) => (
        <div
          className="border border-border rounded-md overflow-hidden bg-card shadow-sm"
          key={file.file_path}
        >
          <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold font-mono text-foreground">
              {file.file_path}
            </span>
            <div className="text-xs font-mono flex gap-3 text-muted-foreground">
              <span className="text-green-600 dark:text-green-500">+{file.additions}</span>
              <span className="text-destructive">-{file.deletions}</span>
            </div>
          </div>

          <div className="overflow-x-auto bg-card text-xs font-mono leading-relaxed p-2">
            {file.diff.map((line, lineIndex) => (
              <div className={getDiffLineClass(line)} key={`${file.file_path}-${lineIndex}`}>
                {line || " "}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-card">
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
