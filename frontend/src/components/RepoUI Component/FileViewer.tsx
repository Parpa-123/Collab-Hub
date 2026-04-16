import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import connect from "../../axios/connect";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { errorToast } from "../../lib/toast";

/* ── Language mapping from file extension ── */
const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  bash: "bash",
  sql: "sql",
  xml: "xml",
  java: "java",
  go: "go",
  rs: "rust",
  c: "c",
  cpp: "cpp",
  h: "c",
  rb: "ruby",
  php: "php",
  txt: "text",
  gitignore: "text",
  env: "text",
  dockerfile: "docker",
  toml: "toml",
};

function langFromPath(path: string): string {
  const filename = path.split("/").pop() ?? "";
  // Handle special filenames like Dockerfile, Makefile
  const lower = filename.toLowerCase();
  if (lower === "dockerfile") return "docker";
  if (lower === "makefile") return "makefile";

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] || "text";
}

const FileViewer = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const filePath = searchParams.get("path") ?? "";
  const branch = searchParams.get("branch") ?? "main";

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug || !filePath) return;

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await connect.get(`/repositories/${slug}/file-content/`, {
          params: { path: filePath, branch },
        });
        setContent(res.data.content ?? "");
      } catch (err: any) {
        errorToast(err, "Failed to load file");
        setError(
          err.response?.data?.error || "Failed to load file content."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [slug, filePath, branch]);

  const handleCopy = async () => {
    if (content === null) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Breadcrumb segments ── */
  const segments = filePath.split("/").filter(Boolean);
  const fileName = segments[segments.length - 1] ?? filePath;
  const language = langFromPath(filePath);
  const lineCount = content?.split("\n").length ?? 0;

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading file…</span>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || content === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm">{error || "File not found."}</p>
        <Link
          to={`/${slug}`}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back to code
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 max-w-[1200px] mx-auto">
      {/* ── Breadcrumbs ── */}
      <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <Link
          to={`/${slug}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {slug}
        </Link>

        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const partialPath = segments.slice(0, idx + 1).join("/");

          return (
            <span key={partialPath} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              {isLast ? (
                <span className="font-semibold text-gray-900">{seg}</span>
              ) : (
                <Link
                  to={`/${slug}?path=${encodeURIComponent(partialPath)}&branch=${branch}`}
                  className="text-blue-600 hover:underline"
                >
                  {seg}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* ── File header bar ── */}
      <div className="border border-gray-200 rounded-t-lg bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span className="font-medium text-gray-900">{fileName}</span>
          <span className="text-gray-400">·</span>
          <span>{lineCount} lines</span>
          <span className="text-gray-400">·</span>
          <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
            {language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
          title="Copy file contents"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* ── Syntax-highlighted code ── */}
      <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers
          wrapLines
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1em",
            color: "#636c76",
            userSelect: "none",
          }}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default FileViewer;
