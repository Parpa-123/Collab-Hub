import { useEffect, useState } from 'react'
import connect from '../../axios/connect';
import { fetchAllPages } from '@/lib/pagination';
import { useParams } from 'react-router-dom';
import BranchesCreation from './BranchesCreation';
import { GitBranch, Trash2, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { errorToast, successToast } from '../../lib/toast';

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
      const data = await fetchAllPages<Branch>(connect, `/repositories/${slug}/branches`);
      setBranches(data);
    } catch (error) {
      errorToast(error, 'Failed to fetch branches');
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
        source: formData.get('source') as string,
      };

      await connect.post(`/repositories/${slug}/branches/`, payload);
      successToast('Branch created successfully!');
      fetchBranches();
    } catch (error) {
      errorToast(error, 'Failed to create branch');
    }
  };

  const handleDeleteBranch = async (branchId: number, branchName: string) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branchName}"?`)) return;

    try {
      await connect.delete(`/repositories/${slug}/branches/${branchId}/`);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      successToast('Branch deleted successfully!');
    } catch (error) {
      errorToast(error, 'Failed to delete branch');
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
      successToast('Branch updated successfully!');
      fetchBranches();
    } catch (error) {
      errorToast(error, 'Failed to update branch');
    }
  };

  return (
    <div className="px-6 py-6 bg-muted/30 min-h-full font-sans text-foreground">

      {/* Top row: Title + Create Branch */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Branches
          </h2>
          <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/20">
            {branches.length}
          </span>
        </div>

        <BranchesCreation 
          onCreateBranch={handleCreateBranch} 
          branchlist={branches.map((branch) => branch.name)} 
          defaultBranch={branches.find(b => b.is_default)?.name}
        />
      </div>

      {/* Branch list container */}
      <div className="border border-border rounded-md bg-card overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              {/* Left side: branch name + badges */}
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                  {branch.name}
                </span>

                {/* Show default badge based on is_default field */}
                {branch.is_default && (
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/20">
                    default
                  </span>
                )}

                {/* Show protected badge based on is_protected field */}
                {branch.is_protected && (
                  <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-500/20">
                    protected
                  </span>
                )}
              </div>

              {/* Right side: timestamp + delete */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground/70">
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
                          className="p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded transition-colors"
                          title="Edit branch"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      }
                    />
                    <button
                      onClick={() => handleDeleteBranch(branch.id, branch.name)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
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
            <div className="px-4 py-8 text-center text-muted-foreground">
              <GitBranch className="w-12 h-12 text-border mx-auto mb-3" />
              <p className="text-sm">
                No branches found. Create your first branch to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer text */}
      <div className="text-center text-xs text-muted-foreground/60 mt-4">
        Showing all {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
      </div>
    </div>
  );
};

export default Branches;
