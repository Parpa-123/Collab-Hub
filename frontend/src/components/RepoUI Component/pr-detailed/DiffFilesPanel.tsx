import { FileCode, Loader2, FileImage } from "lucide-react";
import CommentList from "../../comments/CommentList";
import { getDiffLineClass } from "./helpers";
import type { FileDiff } from "./types";

interface DiffFilesPanelProps {
  diffFiles: FileDiff[];
  diffLoading: boolean;
  hideViewed: boolean;
  myRole: string | null;
  onToggleHideViewed: (value: boolean) => void;
  onToggleViewed: (filePath: string, viewed: boolean) => void;
  prId: number;
  slug: string;
  viewedMap: Record<string, boolean>;
}

export default function DiffFilesPanel({
  diffFiles,
  diffLoading,
  hideViewed,
  myRole,
  onToggleHideViewed,
  onToggleViewed,
  prId,
  slug,
  viewedMap,
}: DiffFilesPanelProps) {
  const visibleFiles = hideViewed
    ? diffFiles.filter((file) => !viewedMap[file.file_path])
    : diffFiles;

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
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
        <div className="text-muted-foreground">
          Viewed progress:{" "}
          <span className="font-semibold text-foreground">
            {Object.values(viewedMap).filter(Boolean).length} / {diffFiles.length}
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            checked={hideViewed}
            onChange={(event) => onToggleHideViewed(event.target.checked)}
            type="checkbox"
          />
          Collapse viewed files
        </label>
      </div>

      {visibleFiles.length === 0 && hideViewed ? (
        <div className="rounded-md border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          All files are marked as viewed.
        </div>
      ) : null}

      {visibleFiles.map((file) => (
        <div
          className="border border-border rounded-md overflow-hidden bg-card shadow-sm"
          key={file.file_path}
        >
          <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold font-mono text-foreground">
              {file.file_path}
            </span>
            <div className="text-xs font-mono flex items-center gap-3 text-muted-foreground">
              <span className="text-green-600 dark:text-green-500">+{file.additions}</span>
              <span className="text-destructive">-{file.deletions}</span>
              <label className="flex items-center gap-1 text-[11px]">
                <input
                  checked={Boolean(viewedMap[file.file_path])}
                  onChange={(event) => onToggleViewed(file.file_path, event.target.checked)}
                  type="checkbox"
                />
                Mark as viewed
              </label>
            </div>
          </div>

          <div className="overflow-x-auto bg-card text-xs font-mono leading-relaxed p-2">
            {file.diff.length === 1 && file.diff[0].startsWith("Binary files") ? (
              <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded flex flex-col items-center justify-center gap-2">
                <FileImage className="w-8 h-8 opacity-50" />
                <span>{file.diff[0]}</span>
              </div>
            ) : (
              <>
                {file.diff.slice(0, 500).map((line, lineIndex) => (
                  <div className={getDiffLineClass(line)} key={`${file.file_path}-${lineIndex}`}>
                    {line || " "}
                  </div>
                ))}
                {file.diff.length > 500 && (
                  <div className="text-center py-3 text-muted-foreground bg-muted/50 mt-2 border border-border/50 rounded-sm">
                    Large diff truncated. Showing the first 500 lines.
                  </div>
                )}
              </>
            )}
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
