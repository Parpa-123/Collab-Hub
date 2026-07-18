import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  emptyState?: ReactNode;
}

export function MarkdownRenderer({ content, className, emptyState }: MarkdownRendererProps) {
  if (!content.trim()) {
    return (
      <div className={className}>
        {emptyState ?? <p className="text-muted-foreground italic">No description provided.</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
          a: ({ href, children }) => (
            <a className="text-primary underline" href={href} rel="noreferrer" target="_blank">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
