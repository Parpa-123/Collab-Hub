import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom';
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
    <div className="px-6 py-4 flex gap-6 bg-background text-foreground">

      {/* LEFT SIDE (Files) */}
      <div className="w-3/4">

        {/* Branch + search + buttons row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <select 
              className="border border-border px-3 py-1 rounded text-sm bg-muted hover:bg-accent cursor-pointer outline-none transition-colors"
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
            >
              {repoData?.branch_names?.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              {!repoData?.branch_names?.includes(selectedBranch) && (
                 <option value={selectedBranch}>{selectedBranch}</option>
              )}
            </select>
            <button className="border border-border px-3 py-1 rounded text-sm bg-card hover:bg-accent transition-colors">
              {repoData?.branches || 0} Branches
            </button>
            <button className="border border-border px-3 py-1 rounded text-sm bg-card hover:bg-accent transition-colors">
              0 Tags
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              placeholder="Go to file"
              className="bg-card border border-border rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <FileUploadCommit 
                slug={slug!} 
                defaultBranch={selectedBranch} 
                onSuccess={() => window.location.reload()} 
              />
              <button className="bg-green-600 dark:bg-green-700 text-white px-4 py-1 rounded text-sm hover:opacity-90 font-medium transition-opacity">
                Code ▾
              </button>
            </div>
          </div>
        </div>

        {/* File list */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <FileExplorer slug={slug!} branch={selectedBranch} />
        </div>
      </div>

      {/* RIGHT SIDE (About Panel) */}
      <div className="w-1/4">
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold mb-2 text-foreground">About</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {repoData?.description}
          </p>

          <div className="text-sm space-y-2 text-muted-foreground">
            <div>README</div>
            <div>0 stars</div>
            <div>0 watching</div>
            <div>0 forks</div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <h4 className="font-semibold mb-1 text-foreground">Releases</h4>
            <p className="text-sm text-muted-foreground/60">No releases published</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Code;
