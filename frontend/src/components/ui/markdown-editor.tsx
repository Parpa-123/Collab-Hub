import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write using Markdown...",
  rows = 5,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex border-b border-border bg-muted/40">
        <button
          className={`px-3 py-2 text-xs font-medium ${
            activeTab === "write"
              ? "bg-card text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("write")}
          type="button"
        >
          Write
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium ${
            activeTab === "preview"
              ? "bg-card text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("preview")}
          type="button"
        >
          Preview
        </button>
      </div>

      {activeTab === "write" ? (
        <Textarea
          className="border-0 rounded-none focus-visible:ring-0 min-h-[140px]"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          value={value}
        />
      ) : (
        <div className="p-3 min-h-[140px] bg-card text-sm">
          <MarkdownRenderer
            className="space-y-3 text-foreground"
            content={value}
            emptyState={<p className="text-muted-foreground italic">Nothing to preview yet.</p>}
          />
        </div>
      )}
    </div>
  );
}
