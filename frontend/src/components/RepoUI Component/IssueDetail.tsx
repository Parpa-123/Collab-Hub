import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import connect from "../../axios/connect";
import type { Issue, Label } from "./Issues";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
    CircleDot,
    CircleCheck,
    Tag,
    User,
    Calendar,
    ArrowLeft,
    Clock,
    Loader2,
    AlertCircle,
    Pencil,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

dayjs.extend(relativeTime);

const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; icon: typeof CircleDot }
> = {
    open: {
        label: "Open",
        color: "text-green-700",
        bg: "bg-green-100 border-green-300",
        icon: CircleDot,
    },
    in_progress: {
        label: "In Progress",
        color: "text-yellow-700",
        bg: "bg-yellow-100 border-yellow-300",
        icon: CircleDot,
    },
    closed: {
        label: "Closed",
        color: "text-purple-700",
        bg: "bg-purple-100 border-purple-300",
        icon: CircleCheck,
    },
};

function creatorName(creator?: Issue["creator"]): string {
    if (!creator) return "unknown";
    if (creator.first_name || creator.last_name)
        return `${creator.first_name ?? ""} ${creator.last_name ?? ""}`.trim();
    return creator.email;
}

const IssueDetail = () => {
    const { slug, id } = useParams<{ slug: string; id: string }>();
    const [issue, setIssue] = useState<Issue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [labels, setLabels] = useState<Label[]>([]);

    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStatus, setEditStatus] = useState<"open" | "in_progress" | "closed">("open");
    const [editParent, setEditParent] = useState("");
    const [editSelectedLabels, setEditSelectedLabels] = useState<number[]>([]);

    useEffect(() => {
        if (!slug || !id) return;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [issueRes, labelsRes] = await Promise.all([
                    connect.get(`/repositories/${slug}/issues/${id}/`),
                    connect.get(`/repositories/${slug}/labels/`),
                ]);
                setIssue(issueRes.data);
                setLabels(labelsRes.data.results ?? labelsRes.data);
            } catch (err: any) {
                console.error("Failed to load issue:", err);
                setError(err.response?.data?.detail || "Issue not found.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug, id]);

    const openEditDialog = () => {
        if (!issue) return;
        setEditTitle(issue.title);
        setEditDescription(issue.description || "");
        setEditStatus(issue.status as "open" | "in_progress" | "closed");
        setEditParent(issue.parent ? String(issue.parent) : "");
        setEditSelectedLabels(issue.labels.map((l) => l.id));
        setEditDialogOpen(true);
    };

    const handleUpdateIssue = async () => {
        if (!editTitle.trim() || !issue) return;
        try {
            setSaving(true);
            const payload = {
                title: editTitle,
                description: editDescription,
                status: editStatus,
                parent: editParent ? Number(editParent) : null,
                label_ids: editSelectedLabels,
            };
            const res = await connect.patch(
                `/repositories/${slug}/issues/${issue.id}/`,
                payload
            );
            setIssue(res.data);
            setEditDialogOpen(false);
        } catch (err: any) {
            console.error("Failed to update issue:", err.response?.data || err);
        } finally {
            setSaving(false);
        }
    };

    const handleCloseIssue = async () => {
        if (!issue) return;
        try {
            setSaving(true);
            const res = await connect.patch(
                `/repositories/${slug}/issues/${issue.id}/`,
                { status: "closed" }
            );
            setIssue(res.data);
        } catch (err: any) {
            console.error("Failed to close issue:", err.response?.data || err);
        } finally {
            setSaving(false);
        }
    };

    const handleReopenIssue = async () => {
        if (!issue) return;
        try {
            setSaving(true);
            const res = await connect.patch(
                `/repositories/${slug}/issues/${issue.id}/`,
                { status: "open" }
            );
            setIssue(res.data);
        } catch (err: any) {
            console.error("Failed to reopen issue:", err.response?.data || err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Loading issue…</span>
            </div>
        );
    }

    if (error || !issue) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-sm">{error || "Issue not found."}</p>
                <Link
                    to={`/${slug}/issues`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    <ArrowLeft size={14} /> Back to issues
                </Link>
            </div>
        );
    }

    const cfg = statusConfig[issue.status] || statusConfig.open;
    const StatusIcon = cfg.icon;

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            <Link
                to={`/${slug}/issues`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-5"
            >
                <ArrowLeft size={14} /> Back to issues
            </Link>

            <div className="mb-6">
                <div className="flex items-start justify-between gap-3">
                    <h1 className="text-2xl font-semibold text-gray-900 leading-snug">
                        {issue.title}
                        <span className="ml-2 text-gray-400 font-normal">#{issue.id}</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openEditDialog}
                            className="flex items-center gap-1.5 shrink-0"
                            disabled={saving}
                        >
                            <Pencil size={14} />
                            Edit
                        </Button>
                        {issue.status !== "closed" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCloseIssue}
                                disabled={saving}
                                className="flex items-center gap-1.5 shrink-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            >
                                <CircleCheck size={14} />
                                Close issue
                            </Button>
                        )}
                        {issue.status === "closed" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReopenIssue}
                                disabled={saving}
                                className="flex items-center gap-1.5 shrink-0 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                            >
                                <CircleDot size={14} />
                                Reopen
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border ${cfg.bg} ${cfg.color}`}
                    >
                        <StatusIcon size={14} />
                        {cfg.label}
                    </span>

                    <span className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">
                            {creatorName(issue.creator)}
                        </span>{" "}
                        opened this issue {dayjs(issue.created_at).fromNow()}
                    </span>
                </div>
            </div>

            <hr className="border-gray-200 mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
                <div>
                    <div className="border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-t-lg border-b border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold uppercase">
                                {(issue.creator?.first_name?.[0] ??
                                    issue.creator?.email?.[0] ??
                                    "?")}
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-gray-800">
                                    {creatorName(issue.creator)}
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                    commented {dayjs(issue.created_at).fromNow()}
                                </span>
                            </div>
                        </div>

                        <div className="px-4 py-5 text-sm text-gray-700 leading-relaxed min-h-[80px]">
                            {issue.description ? (
                                <p className="whitespace-pre-wrap">{issue.description}</p>
                            ) : (
                                <p className="text-gray-400 italic">
                                    No description provided.
                                </p>
                            )}
                        </div>
                    </div>

                    {issue.updated_at && issue.updated_at !== issue.created_at && (
                        <div className="flex items-center gap-2 mt-5 text-xs text-gray-400">
                            <Clock size={12} />
                            Last updated {dayjs(issue.updated_at).fromNow()}
                        </div>
                    )}
                </div>

                <aside className="space-y-5">
                    <SidebarSection title="Assignees" icon={<User size={14} />}>
                        {issue.assignees.length === 0 ? (
                            <p className="text-xs text-gray-400">No one assigned</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {issue.assignees.map((a) => (
                                    <span
                                        key={a.id}
                                        className="inline-flex items-center gap-1.5 text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700"
                                    >
                                        <User size={10} />
                                        Assignee #{a.assignee}
                                    </span>
                                ))}
                            </div>
                        )}
                    </SidebarSection>

                    <SidebarSection title="Labels" icon={<Tag size={14} />}>
                        {issue.labels.length === 0 ? (
                            <p className="text-xs text-gray-400">None yet</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {issue.labels.map((label: Label) => (
                                    <span
                                        key={label.id}
                                        className="px-2.5 py-0.5 text-xs font-medium rounded-full text-white"
                                        style={{ backgroundColor: `#${label.color}` }}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </SidebarSection>

                    <SidebarSection title="Timeline" icon={<Calendar size={14} />}>
                        <ul className="space-y-2 text-xs text-gray-500">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                Created {dayjs(issue.created_at).format("MMM D, YYYY h:mm A")}
                            </li>
                            {issue.updated_at && issue.updated_at !== issue.created_at && (
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                    Updated{" "}
                                    {dayjs(issue.updated_at).format("MMM D, YYYY h:mm A")}
                                </li>
                            )}
                        </ul>
                    </SidebarSection>

                    {issue.parent && (
                        <SidebarSection title="Parent Issue" icon={<CircleDot size={14} />}>
                            <Link
                                to={`/${slug}/issues/${issue.parent}`}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Issue #{issue.parent}
                            </Link>
                        </SidebarSection>
                    )}
                </aside>
            </div>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Issue</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                placeholder="Issue title"
                                value={editTitle}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Describe the issue…"
                                value={editDescription}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={editStatus}
                                onValueChange={(v: string) =>
                                    setEditStatus(v as "open" | "in_progress" | "closed")
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">
                                Parent Issue (optional)
                            </label>
                            <Input
                                placeholder="e.g. 12"
                                value={editParent}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditParent(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Labels</label>
                            <div className="flex flex-wrap gap-2">
                                {labels.map((label) => {
                                    const selected = editSelectedLabels.includes(label.id);
                                    return (
                                        <button
                                            key={label.id}
                                            type="button"
                                            onClick={() =>
                                                setEditSelectedLabels((prev) =>
                                                    prev.includes(label.id)
                                                        ? prev.filter((lid) => lid !== label.id)
                                                        : [...prev, label.id]
                                                )
                                            }
                                            className={`px-2 py-1 text-xs rounded-full text-white ${selected ? "ring-2 ring-black" : ""}`}
                                            style={{ backgroundColor: `#${label.color}` }}
                                        >
                                            {label.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setEditDialogOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateIssue}
                            disabled={saving || !editTitle.trim()}
                        >
                            {saving ? "Saving..." : "Update Issue"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

function SidebarSection({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="border-b border-gray-100 pb-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    );
}

export default IssueDetail;