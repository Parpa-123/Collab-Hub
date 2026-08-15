import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BookOpen, GitBranch, Info, Search, Tag } from "lucide-react";
import connect from "../../axios/connect";
import { errorToast } from "../../lib/toast";
import FileUploadCommit from "./FileUploadCommit";
import FileExplorer from "./FileExplorer";

export interface RepoHeader {
  name: string;
  description: string;
  visibility: "public" | "private";
  default_branch: string;
  branches: number;
  branch_names: string[];
}

const Code = () => {
  const [repoData, setRepoData] = React.useState<RepoHeader | null>(null);
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBranch = searchParams.get("branch") || repoData?.default_branch || "main";

  const handleBranchChange = (newBranch: string) => {
    setSearchParams({ branch: newBranch });
  };

  const [downloadingZip, setDownloadingZip] = React.useState(false);

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const res = await connect.get(`/repositories/${slug}/download-zip/`, {
        params: { branch: selectedBranch },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = res.headers['content-disposition'];
      let filename = `${repoData?.name || 'repository'}-${selectedBranch}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      errorToast(error, "Failed to download repository");
    } finally {
      setDownloadingZip(false);
    }
  };

  React.useEffect(() => {
    const fetchRepoData = async () => {
      try {
        const data = await connect.get(`/repositories/${slug}/`);
        setRepoData(data.data);
      } catch (error) {
        errorToast(error, "Failed to load repository data");
      }
    };
    fetchRepoData();
  }, [slug]);

  return (
    <div className="bg-background px-4 py-4 text-foreground sm:px-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <select
                aria-label="Select branch"
                className="h-10 min-w-36 rounded-md border border-border bg-muted px-3 text-sm outline-none transition-colors hover:bg-accent"
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {repoData?.branch_names?.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
                {!repoData?.branch_names?.includes(selectedBranch) && (
                  <option value={selectedBranch}>{selectedBranch}</option>
                )}
              </select>

              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span>{repoData?.branches || 0}</span>
                <span>Branches</span>
              </button>

              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm transition-colors hover:bg-accent">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span>0</span>
                <span>Tags</span>
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative min-w-0 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Go to file"
                  className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {downloadingZip ? "Preparing ZIP..." : "Download ZIP"}
                </button>
                <FileUploadCommit
                  slug={slug!}
                  defaultBranch={selectedBranch}
                  onSuccess={() => window.location.reload()}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-card">
            <FileExplorer slug={slug!} branch={selectedBranch} />
          </div>
        </div>

        <aside className="min-w-0 xl:w-[280px]">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">About</h3>
            </div>

            <p className="mb-4 break-words text-sm leading-6 text-muted-foreground">
              {repoData?.description || "No description provided."}
            </p>

            <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>README</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span>Default branch: {repoData?.default_branch || "main"}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <h4 className="mb-1 font-semibold text-foreground">Releases</h4>
              <p className="text-sm text-muted-foreground/70">No releases published</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Code;
