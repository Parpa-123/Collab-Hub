import React from "react";
import { Search, ChevronDown, Tag, Milestone, GitPullRequest } from "lucide-react";

const PullRequests = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          
          <div className="flex flex-1 items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm hover:bg-gray-100">
              Filters
              <ChevronDown size={16} />
            </button>

            <div className="flex items-center flex-1 border border-gray-300 rounded-md bg-white px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="is:pr is:open"
                className="ml-2 w-full outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm hover:bg-gray-100">
              <Tag size={16} />
              Labels
            </button>

            <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition">
              New pull request
            </button>
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg bg-white h-[420px] flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="flex justify-center mb-4 text-gray-400">
              <GitPullRequest size={40} strokeWidth={1.5} />
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome to pull requests
            </h2>

            <p className="text-gray-600 text-sm leading-relaxed">
              Pull requests help you collaborate on code with other people. As
              pull requests are created, they’ll appear here in a searchable and
              filterable list. To get started, you should{" "}
              <span className="text-blue-600 hover:underline cursor-pointer">
                create a pull request
              </span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PullRequests;
