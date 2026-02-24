import { useEffect, useState, useCallback } from "react";
import { MessageCircle, Loader2, AlertCircle } from "lucide-react";
import connect from "../../axios/connect";
import CommentItem, { type CommentData } from "./CommentItem";
import CommentForm from "./CommentForm";

interface CommentListProps {
    slug: string;
    model: string;
    objectId: number;
    myRole: string | null;
}

const CommentList = ({ slug, model, objectId, myRole }: CommentListProps) => {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await connect.get(
                `/repositories/${slug}/comments/?model=${model}&object_id=${objectId}`
            );
            setComments(res.data);
        } catch (err: any) {
            setError(
                err.response?.data?.detail || "Failed to load comments."
            );
        } finally {
            setLoading(false);
        }
    }, [slug, model, objectId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    return (
        <div>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-[#636c76]" />
                <h3 className="text-sm font-semibold text-[#1f2328]">
                    Discussion
                    {!loading && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                            ({comments.length})
                        </span>
                    )}
                </h3>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading comments…</span>
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <div className="flex items-center gap-2 py-6 justify-center text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && comments.length === 0 && (
                <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-[#d0d7de] mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                        No comments yet. Start the conversation!
                    </p>
                </div>
            )}

            {/* Comments */}
            {!loading &&
                !error &&
                comments.map((c) => (
                    <CommentItem
                        key={c.id}
                        comment={c}
                        slug={slug}
                        model={model}
                        objectId={objectId}
                        myRole={myRole}
                        onRefresh={fetchComments}
                    />
                ))}

            {/* New comment form */}
            <CommentForm
                slug={slug}
                model={model}
                objectId={objectId}
                onSuccess={fetchComments}
            />
        </div>
    );
};

export default CommentList;
