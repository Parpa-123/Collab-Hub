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
    <div className={`prose dark:prose-invert max-w-none text-foreground ${className ?? ""}`}>
      <ReactMarkdown
        components={{
          code: ({ children }) => (
            <code className="rounded bg-muted/80 text-foreground border border-border/50 px-1.5 py-0.5 font-mono text-[0.825rem] font-medium">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-slate-950 p-4 text-slate-100 font-mono text-xs shadow-inner leading-relaxed">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-md border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/70 px-3 py-2 text-left font-semibold text-foreground text-xs uppercase tracking-wider">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-border/50 px-3 py-2 align-top text-foreground/90">{children}</td>,
          a: ({ href, children }) => (
            <a className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors" href={href} rel="noreferrer" target="_blank">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mt-4 mb-2 pb-1 border-b border-border/60">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-2 mb-1">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/60 bg-muted/30 pl-4 py-1.5 my-2 text-muted-foreground italic rounded-r-md">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-2 text-foreground/90 leading-relaxed">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-2 text-foreground/90 leading-relaxed">{children}</ol>,
          p: ({ children }) => <p className="leading-relaxed my-1.5 text-foreground/90">{children}</p>,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
