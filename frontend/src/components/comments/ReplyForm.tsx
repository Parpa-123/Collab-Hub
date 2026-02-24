import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import connect from "../../axios/connect";

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
            onSuccess();
        } catch (err: any) {
            setError(
                err.response?.data?.detail ||
                err.response?.data?.content?.[0] ||
                "Failed to post reply."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-2 ml-6 pl-4 border-l-2 border-[#d0d7de]">
            <div className="border border-[#d0d7de] rounded-lg overflow-hidden bg-white focus-within:border-[#0969da] focus-within:ring-1 focus-within:ring-[#0969da] transition-all">
                <textarea
                    ref={textareaRef}
                    rows={2}
                    placeholder="Write a reply…"
                    className="w-full px-3 py-2 text-sm outline-none resize-none bg-transparent placeholder:text-gray-400"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                        if (e.key === "Escape") onCancel();
                    }}
                />
                <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-[#f6f8fa] border-t border-[#d0d7de]">
                    <button
                        onClick={onCancel}
                        className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !content.trim()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-[#1f883d] text-white hover:bg-[#1a7f37] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
};

export default ReplyForm;
