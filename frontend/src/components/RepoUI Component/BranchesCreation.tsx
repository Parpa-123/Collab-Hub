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
    onCreateBranch?: (formData: FormData) => void;
    onUpdateBranch?: (id: number, formData: FormData) => void;
    branchlist: string[];
    initialData?: {
        id: number;
        name: string;
        is_protected: boolean;
        is_default: boolean;
    };
    mode?: 'create' | 'edit';
    trigger?: React.ReactNode;
    defaultBranch?: string;
}

const BranchesCreation = ({
    onCreateBranch,
    onUpdateBranch,
    branchlist,
    initialData,
    mode = 'create',
    trigger,
    defaultBranch
}: BranchesCreationProps) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formRef.current) {
            const formData = new FormData(formRef.current);
            if (mode === 'create' && onCreateBranch) {
                onCreateBranch(formData);
            } else if (mode === 'edit' && onUpdateBranch && initialData) {
                onUpdateBranch(initialData.id, formData);
            }
            if (mode === 'create') formRef.current.reset();
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <button className="bg-green-600 dark:bg-green-700 text-white px-4 py-[5px] rounded-md font-medium text-sm hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2">
                        <GitBranchPlus className="w-4 h-4" />
                        New branch
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 text-foreground" showCloseButton={false}>
                <DialogHeader className="p-4 border-b border-border">
                    <DialogTitle className="text-base font-semibold text-foreground">
                        {mode === 'create' ? 'Create a branch' : 'Edit branch'}
                    </DialogTitle>
                </DialogHeader>

                <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="p-4 space-y-4">
                        {/* Branch Name Input */}
                        <div className="space-y-2">
                            <label htmlFor="branch-name" className="text-sm font-semibold text-foreground block">
                                New branch name <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="branch-name"
                                    name="name"
                                    type="text"
                                    required
                                    defaultValue={initialData?.name}
                                    placeholder="feature/my-new-branch"
                                    className="w-full px-3 py-[5px] bg-muted border border-border rounded-md shadow-sm text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pr-10"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('branch-name') as HTMLInputElement;
                                        navigator.clipboard.writeText(input?.value || '');
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Copy branch name"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Source Branch Selector */}
                        {/* Source Branch Selector - Hide in Edit Mode */}
                        {mode === 'create' && (
                            <div className="space-y-2">
                                <label htmlFor="source" className="text-sm font-semibold text-foreground block">
                                    Source
                                </label>
                                <div className="relative inline-block">
                                    <div className="flex items-center gap-2 px-3 py-[5px] bg-muted border border-border rounded-md shadow-sm text-sm">
                                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                                        <select
                                            name="source"
                                            id="source"
                                            defaultValue={defaultBranch || branchlist[0] || 'main'}
                                            className="bg-transparent border-none text-sm text-foreground focus:outline-none cursor-pointer pr-6 appearance-none"
                                        >
                                            {branchlist.length > 0 ? (
                                                branchlist.map((branch) => (
                                                    <option key={branch} value={branch}>{branch}</option>
                                                ))
                                            ) : (
                                                <option value="main">main</option>
                                            )}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Branch Options */}
                        <div className="space-y-3 pt-2">
                            {/* Is Default Checkbox */}
                            <div className="flex items-start">
                                <div className="flex h-5 items-center">
                                    <input
                                        id="is_default"
                                        name="is_default"
                                        type="checkbox"
                                        defaultChecked={initialData?.is_default}
                                        className="h-4 w-4 border-border rounded text-primary focus:ring-primary bg-background"
                                    />
                                </div>
                                <div className="ml-3">
                                    <label htmlFor="is_default" className="text-sm font-medium text-foreground cursor-pointer">
                                        Set as default branch
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
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
                                        defaultChecked={initialData?.is_protected}
                                        className="h-4 w-4 border-border rounded text-primary focus:ring-primary bg-background"
                                    />
                                </div>
                                <div className="ml-3">
                                    <label htmlFor="is_protected" className="text-sm font-medium text-foreground cursor-pointer">
                                        Protect this branch
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Require pull request reviews before merging
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/50">
                        <DialogClose asChild>
                            <button
                                type="button"
                                className="px-4 py-[5px] text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="submit"
                            className="px-4 py-[5px] text-sm font-medium text-white bg-green-600 dark:bg-green-700 rounded-md hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mode === 'create' ? 'Create branch' : 'Update branch'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default BranchesCreation