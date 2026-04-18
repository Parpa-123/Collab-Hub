import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import connect from "../../axios/connect";
import { errorToast, successToast } from "../../lib/toast";

interface ReplyFormProps {
    slug: string;
    model: string;
    objectId: number;
    parentId: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const ReplyForm = ({
    slug,
    model,
    objectId,
    parentId,
    onSuccess,
    onCancel,
}: ReplyFormProps) => {
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await connect.post(`/repositories/${slug}/comments/`, {
                model,
                object_id: objectId,
                parent: parentId,
                content: content.trim(),
            });
            setContent("");
            successToast("Reply posted!");
            onSuccess();
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail ||
                err.response?.data?.content?.[0] ||
                "Failed to post reply.";
            setError(errorMsg);
            errorToast(err, errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-2 ml-6 pl-4 border-l-2 border-border">
            <div className="border border-border rounded-lg overflow-hidden bg-card focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <textarea
                    ref={textareaRef}
                    rows={2}
                    placeholder="Write a reply…"
                    className="w-full px-3 py-2 text-sm outline-none resize-none bg-transparent text-foreground placeholder:text-muted-foreground"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                        if (e.key === "Escape") onCancel();
                    }}
                />
                <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-muted border-t border-border">
                    <button
                        onClick={onCancel}
                        className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !content.trim()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-green-600 dark:bg-green-700 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Send className="w-3 h-3" />
                        )}
                        Reply
                    </button>
                </div>
            </div>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
};

export default ReplyForm;
