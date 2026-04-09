import React from 'react'
import { useParams } from 'react-router-dom';
import connect from "../../axios/connect";
import FileUploadCommit from "./FileUploadCommit";

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

  React.useEffect(() => {
    const fetchRepoData = async () => {
      try {
        const data = await connect.get(`/repositories/${slug}/`);
        setRepoData(data.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchRepoData();
  }, [slug]);

  return (
    <div className="px-6 py-4 flex gap-6 bg-white text-gray-900">

      {/* LEFT SIDE (Files) */}
      <div className="w-3/4">

        {/* Branch + search + buttons row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button className="border border-gray-300 px-3 py-1 rounded text-sm bg-white hover:bg-gray-100">
              {repoData?.default_branch || "main"}
            </button>
            <button className="border border-gray-300 px-3 py-1 rounded text-sm bg-white hover:bg-gray-100">
              {repoData?.branches || 0} Branches
            </button>
            <button className="border border-gray-300 px-3 py-1 rounded text-sm bg-white hover:bg-gray-100">
              0 Tags
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              placeholder="Go to file"
              className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex gap-2">
              <FileUploadCommit 
                slug={slug!} 
                defaultBranch={repoData?.default_branch} 
                onSuccess={() => window.location.reload()} 
              />
              <button className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 font-medium">
                Code ▾
              </button>
            </div>
          </div>
        </div>

        {/* File list */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 p-3 text-sm border-b border-gray-200">
            <span className="text-gray-600">Latest commit message...</span>
          </div>

          <div className="divide-y divide-gray-200">
            {repoData?.branch_names?.map((branch) => (
              <div
                key={branch}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {branch}
                </div>
                <span className="text-sm text-gray-500">last week</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (About Panel) */}
      <div className="w-1/4">
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">About</h3>
          <p className="text-sm text-gray-700 mb-4">
            {repoData?.description}
          </p>

          <div className="text-sm space-y-2 text-gray-800">
            <div>README</div>
            <div>0 stars</div>
            <div>0 watching</div>
            <div>0 forks</div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-1">Releases</h4>
            <p className="text-sm text-gray-500">No releases published</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Code;
