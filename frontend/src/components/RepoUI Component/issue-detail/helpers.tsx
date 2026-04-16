import { CircleCheck, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Issue } from "../Issues";

type IssueStatus = Issue["status"];

export const statusConfig: Record<
  IssueStatus,
  { label: string; color: string; bg: string; icon: LucideIcon }
> = {
  open: {
    label: "Open",
    color: "text-green-700",
    bg: "bg-green-100 border-green-300",
    icon: CircleDot,
  },
  in_progress: {
    label: "In Progress",
    color: "text-yellow-700",
    bg: "bg-yellow-100 border-yellow-300",
    icon: CircleDot,
  },
  closed: {
    label: "Closed",
    color: "text-purple-700",
    bg: "bg-purple-100 border-purple-300",
    icon: CircleCheck,
  },
};

export function creatorName(creator?: Issue["creator"]): string {
  if (!creator) {
    return "unknown";
  }
  if (creator.first_name || creator.last_name) {
    return `${creator.first_name ?? ""} ${creator.last_name ?? ""}`.trim();
  }
  return creator.email;
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
