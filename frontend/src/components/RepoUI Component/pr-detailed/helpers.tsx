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

export function getStatusMeta(status: PullRequestDetail["status"]) {
  switch (status) {
    case "OPEN":
      return { color: "bg-green-600 text-white", icon: GitPullRequest, label: "Open" };
    case "MERGED":
      return { color: "bg-purple-600 text-white", icon: GitMerge, label: "Merged" };
    case "CLOSED":
      return { color: "bg-red-600 text-white", icon: XCircle, label: "Closed" };
  }
}

export function getDiffLineClass(line: string) {
  const baseClass = "px-2 py-0.5 whitespace-pre ";

  if (line.startsWith("+") && !line.startsWith("+++")) {
    return `${baseClass}bg-[#e6ffed] text-[#24292e]`;
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return `${baseClass}bg-[#ffeef0] text-[#24292e]`;
  }
  if (line.startsWith("@@")) {
    return `${baseClass}bg-[#f1f8ff] text-[#0969da] py-2`;
  }

  return `${baseClass}text-gray-500`;
}
