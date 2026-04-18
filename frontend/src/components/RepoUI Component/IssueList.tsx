import { Circle, MessageSquare, Trash2 } from "lucide-react";
import type { Issue } from "./Issues";
import { Link } from "react-router-dom";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IssueListProps {
    issues: Issue[];
    loading: boolean;
    onDelete: (id: number) => void;
}

const IssueList: React.FC<IssueListProps> = ({
    issues,
    loading,
    onDelete,
}) => {
    if (loading) {
        return (
            <div className="p-6 text-center text-muted-foreground">Loading issues...</div>
        );
    }

    if (issues.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground">No issues found.</div>
        );
    }

    return (
        <div className="divide-y divide-border text-foreground">
            {issues.map((issue) => (
                <div
                    key={issue.id}
                    className="flex justify-between items-start p-4 hover:bg-muted/50 transition-colors"
                >
                    <div>
                        <div className="flex items-center gap-2">
                            <Circle size={14} className="text-green-500 fill-green-500" />
                            <Link to={`${issue.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">{issue.title}</Link>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            {issue.labels.map((label) => (
                                <span
                                    key={label.id}
                                    className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                                    style={{ backgroundColor: `#${label.color}` }}
                                >
                                    {label.name}
                                </span>
                            ))}
                        </div>

                        <div className="text-xs text-muted-foreground mt-2">
                            #{issue.id} opened {new Date(issue.created_at).toLocaleString()}{" "}
                            by{" "}
                            <span className="font-medium text-foreground">
                                {issue.creator
                                    ? issue.creator.first_name || issue.creator.last_name
                                        ? `${issue.creator.first_name} ${issue.creator.last_name}`
                                        : issue.creator.email
                                    : "unknown"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                            <MessageSquare size={16} />
                            <span>{issue.assignees?.length || 0}</span>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="p-1 hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] text-foreground">
                                <DialogHeader>
                                    <DialogTitle>Delete Issue</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to delete this issue? This action cannot be undone.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                        <Button variant="destructive" onClick={() => onDelete(issue.id)}>Delete</Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default IssueList;
