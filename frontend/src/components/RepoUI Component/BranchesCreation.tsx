import React, { useRef, useState } from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { GitBranch, Copy, ChevronDown, GitBranchPlus } from 'lucide-react';

interface BranchesCreationProps {
    onCreateBranch: (formData: FormData) => void;
    branchlist: string[];
}

const BranchesCreation = ({ onCreateBranch, branchlist }: BranchesCreationProps) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formRef.current) {
            const formData = new FormData(formRef.current);
            onCreateBranch(formData);
            formRef.current.reset();
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="bg-[#1f883d] text-white px-4 py-[5px] rounded-md font-medium text-sm hover:bg-[#1a7f37] transition-colors shadow-sm flex items-center gap-2">
                    <GitBranchPlus className="w-4 h-4" />
                    New branch
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-white border-[#d0d7de] p-0" showCloseButton={false}>
                <DialogHeader className="p-4 border-b border-[#d0d7de]">
                    <DialogTitle className="text-base font-semibold text-[#1f2328]">Create a branch</DialogTitle>
                </DialogHeader>

                <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="p-4 space-y-4">
                        {/* Branch Name Input */}
                        <div className="space-y-2">
                            <label htmlFor="branch-name" className="text-sm font-semibold text-[#1f2328] block">
                                New branch name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="branch-name"
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="feature/my-new-branch"
                                    className="w-full px-3 py-[5px] bg-[#f6f8fa] border border-[#d0d7de] rounded-md shadow-sm text-sm text-[#1f2328] focus:outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da] pr-10"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('branch-name') as HTMLInputElement;
                                        navigator.clipboard.writeText(input?.value || '');
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#636c76] hover:text-[#1f2328]"
                                    title="Copy branch name"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Source Branch Selector */}
                        <div className="space-y-2">
                            <label htmlFor="source" className="text-sm font-semibold text-[#1f2328] block">
                                Source
                            </label>
                            <div className="relative inline-block">
                                <div className="flex items-center gap-2 px-3 py-[5px] bg-[#f6f8fa] border border-[#d0d7de] rounded-md shadow-sm text-sm">
                                    <GitBranch className="w-4 h-4 text-[#636c76]" />
                                    <select
                                        name="source"
                                        id="source"
                                        defaultValue={branchlist[0] || 'main'}
                                        className="bg-transparent border-none text-sm text-[#1f2328] focus:outline-none cursor-pointer pr-6 appearance-none"
                                    >
                                        {branchlist.length > 0 ? (
                                            branchlist.map((branch) => (
                                                <option key={branch} value={branch}>{branch}</option>
                                            ))
                                        ) : (
                                            <option value="main">main</option>
                                        )}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-[#636c76] absolute right-2" />
                                </div>
                            </div>
                        </div>

                        {/* Branch Options */}
                        <div className="space-y-3 pt-2">
                            {/* Is Default Checkbox */}
                            <div className="flex items-start">
                                <div className="flex h-5 items-center">
                                    <input
                                        id="is_default"
                                        name="is_default"
                                        type="checkbox"
                                        className="h-4 w-4 border-[#d0d7de] rounded text-[#0969da] focus:ring-[#0969da]"
                                    />
                                </div>
                                <div className="ml-3">
                                    <label htmlFor="is_default" className="text-sm font-medium text-[#1f2328] cursor-pointer">
                                        Set as default branch
                                    </label>
                                    <p className="text-xs text-[#636c76] mt-0.5">
                                        New pull requests will target this branch by default
                                    </p>
                                </div>
                            </div>

                            {/* Is Protected Checkbox */}
                            <div className="flex items-start">
                                <div className="flex h-5 items-center">
                                    <input
                                        id="is_protected"
                                        name="is_protected"
                                        type="checkbox"
                                        className="h-4 w-4 border-[#d0d7de] rounded text-[#0969da] focus:ring-[#0969da]"
                                    />
                                </div>
                                <div className="ml-3">
                                    <label htmlFor="is_protected" className="text-sm font-medium text-[#1f2328] cursor-pointer">
                                        Protect this branch
                                    </label>
                                    <p className="text-xs text-[#636c76] mt-0.5">
                                        Require pull request reviews before merging
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#d0d7de] bg-[#f6f8fa]">
                        <DialogClose asChild>
                            <button
                                type="button"
                                className="px-4 py-[5px] text-sm font-medium text-[#1f2328] bg-[#f6f8fa] border border-[#d0d7de] rounded-md hover:bg-[#ebf0f4] transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="submit"
                            className="px-4 py-[5px] text-sm font-medium text-white bg-[#1f883d] rounded-md hover:bg-[#1a7f37] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create branch
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default BranchesCreation