import { useState, useContext } from "react";
import {
    MessageSquare,
    Pencil,
    Trash2,
    Check,
    X,
    Loader2,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import connect from "../../axios/connect";
import { userContext } from "../../Context/userContext";
import { errorToast, successToast } from "../../lib/toast";
import ReplyForm from "./ReplyForm";

dayjs.extend(relativeTime);

export interface CommentAuthor {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

export interface CommentData {
    id: number;
    content_type: number;
    object_id: number;
    author: CommentAuthor;
    content: string;
    parent: number | null;
    replies: CommentData[];
    created_at: string;
    updated_at: string;
}

interface CommentItemProps {
    comment: CommentData;
    slug: string;
    model: string;
    objectId: number;
    myRole: string | null;
    onRefresh: () => void;
    depth?: number;
}

const roleBadge: Record<string, { label: string; cls: string }> = {
    admin: {
        label: "Owner",
        cls: "bg-purple-500/10 text-purple-600 dark:text-purple-500 border-purple-500/20",
    },
    maintainer: {
        label: "Maintainer",
        cls: "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20",
    },
    member: {
        label: "Member",
        cls: "bg-muted text-muted-foreground border-border",
    },
    viewer: {
        label: "Viewer",
        cls: "bg-muted/50 text-muted-foreground border-border",
    },
};

function authorName(author: CommentAuthor): string {
    if (author.first_name || author.last_name)
        return `${author.first_name ?? ""} ${author.last_name ?? ""}`.trim();
    return author.email;
}

function authorInitial(author: CommentAuthor): string {
    return (author.first_name?.[0] ?? author.email?.[0] ?? "?").toUpperCase();
}

const CommentItem = ({
    comment,
    slug,
    model,
    objectId,
    myRole,
    onRefresh,
    depth = 0,
}: CommentItemProps) => {
    const { login } = useContext(userContext);
    const isAuthor = login?.pk === comment.author.id;
    const canDelete =
        isAuthor || myRole === "admin" || myRole === "maintainer";

    const [replying, setReplying] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleEdit = async () => {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            await connect.patch(`/repositories/${slug}/comments/${comment.id}/`, {
                content: editContent.trim(),
            });
            setEditing(false);
            successToast("Comment updated!");
            onRefresh();
        } catch (error) {
            errorToast(error, "Failed to update comment");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await connect.delete(`/repositories/${slug}/comments/${comment.id}/`);
            successToast("Comment deleted!");
            onRefresh();
        } catch (error) {
            errorToast(error, "Failed to delete comment");
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const avatarBg = depth % 2 === 0 ? "bg-primary/10 text-primary" : "bg-teal-500/10 text-teal-600 dark:text-teal-500";

    return (
        <div className={depth > 0 ? "ml-6 mt-3 pl-4 border-l-2 border-border" : "mt-4"}>
            {/* Comment card */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-t-lg border-b border-border">
                    <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg}`}
                    >
                        {authorInitial(comment.author)}
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                        {authorName(comment.author)}
                    </span>

                    {/* Role badge — only if we know the role and the user is the current author */}
                    {myRole && isAuthor && roleBadge[myRole] && (
                        <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${roleBadge[myRole].cls}`}
                        >
                            {roleBadge[myRole].label}
                        </span>
                    )}

                    <span className="text-xs text-muted-foreground ml-auto">
                        {dayjs(comment.created_at).fromNow()}
                        {comment.updated_at !== comment.created_at && (
                            <span className="ml-1 italic">(edited)</span>
                        )}
                    </span>
                </div>

                {/* Body */}
                <div className="px-4 py-3">
                    {editing ? (
                        <div>
                            <textarea
                                rows={3}
                                className="w-full border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-card text-foreground resize-none transition-all"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                disabled={saving}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEdit();
                                    if (e.key === "Escape") {
                                        setEditing(false);
                                        setEditContent(comment.content);
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2 mt-2 justify-end">
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditContent(comment.content);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                                <button
                                    onClick={handleEdit}
                                    disabled={saving || !editContent.trim()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-green-600 dark:bg-green-700 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {saving ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Check className="w-3 h-3" />
                                    )}
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {comment.content}
                        </p>
                    )}
                </div>

                {/* Action bar */}
                {!editing && (
                    <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-muted/20">
                        <button
                            onClick={() => setReplying(!replying)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Reply
                        </button>

                        {isAuthor && (
                            <button
                                onClick={() => {
                                    setEditContent(comment.content);
                                    setEditing(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                            </button>
                        )}

                        {canDelete && (
                            <>
                                {confirmDelete ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs">
                                        <span className="text-red-600 font-medium">Delete?</span>
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="text-red-600 hover:text-red-800 font-medium transition-colors"
                                        >
                                            {deleting ? "…" : "Yes"}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            No
                                        </button>
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Reply form */}
            {replying && (
                <ReplyForm
                    slug={slug}
                    model={model}
                    objectId={objectId}
                    parentId={comment.id}
                    onSuccess={() => {
                        setReplying(false);
                        onRefresh();
                    }}
                    onCancel={() => setReplying(false)}
                />
            )}

            {/* Nested replies */}
            {comment.replies?.map((reply) => (
                <CommentItem
                    key={reply.id}
                    comment={reply}
                    slug={slug}
                    model={model}
                    objectId={objectId}
                    myRole={myRole}
                    onRefresh={onRefresh}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
};

export default CommentItem;
