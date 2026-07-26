import { GitMerge, GitPullRequest, XCircle } from "lucide-react";
import type { PullRequestDetail } from "./types";

type ApiListResponse<T> = T[] | { results?: T[] };

export function normalizeListResponse<T>(payload: ApiListResponse<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const maybeError = error as {
    message?: string;
    response?: { data?: unknown };
  };

  const responseData = maybeError.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const data = responseData as Record<string, unknown>;
    const nonFieldErrors = data.non_field_errors;

    if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === "string") {
      return nonFieldErrors[0];
    }
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (typeof data.error === "string") {
      return data.error;
    }

    const firstValue = Object.values(data)[0];
    if (typeof firstValue === "string") {
      return firstValue;
    }
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
  }

  if (typeof maybeError.message === "string" && maybeError.message.trim()) {
    return maybeError.message;
  }

  return fallback;
}

export function getStatusMeta(pr: Pick<PullRequestDetail, "status" | "is_draft">) {
  if (pr.status === "OPEN" && pr.is_draft) {
    return {
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
      icon: GitPullRequest,
      label: "Draft",
    };
  }

  switch (pr.status) {
    case "OPEN":
      return { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30", icon: GitPullRequest, label: "Open" };
    case "MERGED":
      return { color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30", icon: GitMerge, label: "Merged" };
    case "CLOSED":
      return { color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30", icon: XCircle, label: "Closed" };
  }
}

export function getDiffLineClass(line: string) {
  const baseClass = "px-2 py-0.5 whitespace-pre font-mono text-xs ";

  if (line.startsWith("+") && !line.startsWith("+++")) {
    return `${baseClass}bg-emerald-500/15 text-emerald-950 dark:text-emerald-200`;
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return `${baseClass}bg-rose-500/15 text-rose-950 dark:text-rose-200`;
  }
  if (line.startsWith("@@")) {
    return `${baseClass}bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 py-1.5 font-semibold border-y border-indigo-500/20`;
  }

  return `${baseClass}text-slate-600 dark:text-slate-300`;
}
