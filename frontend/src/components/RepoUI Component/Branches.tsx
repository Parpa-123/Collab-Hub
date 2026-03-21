import { useEffect, useState } from 'react'
import connect from '../../axios/connect';
import { useParams } from 'react-router-dom';
import BranchesCreation from './BranchesCreation';
import { GitBranch, Trash2, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Branch {
  id: number;
  name: string;
  is_protected: boolean;
  is_default: boolean;
  updated_on: string;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const { slug } = useParams();

  const fetchBranches = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/branches`);
      setBranches(res.data.results ?? res.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [slug]);

  const handleCreateBranch = async (formData: FormData) => {
    try {
      const payload = {
        name: formData.get('name') as string,
        is_protected: formData.get('is_protected') === 'on',
        is_default: formData.get('is_default') === 'on',
      };

      await connect.post(`/repositories/${slug}/branches/`, payload);
      fetchBranches();
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const handleDeleteBranch = async (branchId: number, branchName: string) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branchName}"?`)) return;

    try {
      await connect.delete(`/repositories/${slug}/branches/${branchId}/`);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      alert(error.response?.data?.message || 'Failed to delete branch');
    }
  };

  const handleUpdateBranch = async (id: number, formData: FormData) => {
    try {
      const payload = {
        name: formData.get('name') as string,
        is_protected: formData.get('is_protected') === 'on',
        is_default: formData.get('is_default') === 'on',
      };
      await connect.patch(`/repositories/${slug}/branches/${id}/`, payload);
      fetchBranches();
    } catch (error) {
      console.error('Error updating branch:', error);
      alert('Failed to update branch');
    }
  };

  return (
    <div className="px-6 py-6 bg-[#f6f8fa] min-h-full font-sans text-[#1f2328]">

      {/* Top row: Title + Create Branch */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#636c76]" />
          <h2 className="text-base font-semibold text-[#1f2328]">
            Branches
          </h2>
          <span className="bg-[#ddf4ff] text-[#0969da] text-xs font-medium px-2 py-0.5 rounded-full">
            {branches.length}
          </span>
        </div>

        <BranchesCreation onCreateBranch={handleCreateBranch} branchlist={branches.map((branch) => branch.name)} />
      </div>

      {/* Branch list container */}
      <div className="border border-[#d0d7de] rounded-md bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-[#d0d7de]">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-[#f6f8fa] transition-colors"
            >
              {/* Left side: branch name + badges */}
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-[#636c76]" />
                <span className="text-sm font-medium text-[#0969da] hover:underline cursor-pointer">
                  {branch.name}
                </span>

                {/* Show default badge based on is_default field */}
                {branch.is_default && (
                  <span className="bg-[#ddf4ff] text-[#0969da] text-xs font-medium px-2 py-0.5 rounded-full border border-[#0969da]/20">
                    default
                  </span>
                )}

                {/* Show protected badge based on is_protected field */}
                {branch.is_protected && (
                  <span className="bg-[#fff8c5] text-[#9a6700] text-xs font-medium px-2 py-0.5 rounded-full border border-[#9a6700]/20">
                    protected
                  </span>
                )}
              </div>

              {/* Right side: timestamp + delete */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#636c76]">
                  Updated {dayjs(branch.updated_on).fromNow()}
                </span>


                {!branch.is_default && (
                  <>
                    <BranchesCreation
                      mode="edit"
                      initialData={branch}
                      branchlist={branches.map((b) => b.name)}
                      onUpdateBranch={handleUpdateBranch}
                      trigger={
                        <button
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit branch"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      }
                    />
                    <button
                      onClick={() => handleDeleteBranch(branch.id, branch.name)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="px-4 py-8 text-center">
              <GitBranch className="w-12 h-12 text-[#d0d7de] mx-auto mb-3" />
              <p className="text-sm text-[#636c76]">
                No branches found. Create your first branch to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer text */}
      <div className="text-center text-xs text-[#636c76] mt-4">
        Showing all {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
      </div>
    </div>
  );
};

export default Branches;
