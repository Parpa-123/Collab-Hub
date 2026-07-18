import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Code2, GitBranch, Info, Search, Tag } from "lucide-react";
import connect from "../../axios/connect";
import { errorToast } from "../../lib/toast";
import FileUploadCommit from "./FileUploadCommit";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
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
                <FileUploadCommit
                  slug={slug!}
                  defaultBranch={selectedBranch}
                  onSuccess={() => window.location.reload()}
                />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex h-9 items-center gap-2 rounded-md bg-green-600 px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-green-700">
                      <Code2 className="h-4 w-4" />
                      Code
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[400px] p-4 bg-card text-foreground border-border">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-1">Clone with ghlite CLI</h4>
                        <p className="text-sm text-muted-foreground">Use the official CLI tool to sync your repository locally.</p>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-md border border-border overflow-x-auto relative group">
                        <pre className="text-sm font-mono text-muted-foreground">
<code>{`pip install -e ./cli
ghlite login <YOUR_TOKEN>
ghlite init
ghlite remote add origin http://localhost:8000/api/repositories/${slug}
ghlite pull
`}</code>
                        </pre>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`pip install -e ./cli\nghlite login <YOUR_TOKEN>\nghlite init\nghlite remote add origin http://localhost:8000/api/repositories/${slug}\nghlite pull`);
                            // Optional: add a tiny toast here if you want
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy to clipboard"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

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
