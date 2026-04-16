import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import connect from "../../axios/connect";
import { errorToast, successToast } from "../../lib/toast";

interface CommentFormProps {
  slug: string;
  model: string;
  objectId: number;
  path?: string;
  onSuccess: () => void;
}

const CommentForm = ({ slug, model, objectId, path, onSuccess }: CommentFormProps) => {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        model,
        object_id: objectId,
        content: content.trim(),
      };
      if (path) {
        payload.path = path;
      }
      
      await connect.post(`/repositories/${slug}/comments/`, payload);
      setContent("");
      successToast("Comment posted!");
      onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail ||
        err.response?.data?.content?.[0] ||
        "Failed to post comment.";
      setError(errorMsg);
      errorToast(err, errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="border border-[#d0d7de] rounded-lg overflow-hidden bg-white focus-within:border-[#0969da] focus-within:ring-1 focus-within:ring-[#0969da] transition-all">
        <textarea
          rows={3}
          placeholder="Leave a comment…"
          className="w-full px-3 py-2.5 text-sm outline-none resize-none bg-transparent placeholder:text-gray-400"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <div className="flex items-center justify-between px-3 py-2 bg-[#f6f8fa] border-t border-[#d0d7de]">
          <span className="text-[11px] text-gray-400">Ctrl+Enter to submit</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#1f883d] text-white hover:bg-[#1a7f37] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Comment
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
    </div>
  );
};

export default CommentForm;
