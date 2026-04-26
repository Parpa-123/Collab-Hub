export interface PullRequestUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface PullRequestDetail {
  id: number;
  title: string;
  description: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  source_name: string;
  target_name: string;
  created_by: number;
  created_by_detail?: PullRequestUser | null;
  merged_by_detail?: PullRequestUser | null;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  has_conflicts: boolean;
  is_mergeable: boolean;
}

export interface PullRequestReview {
  id: number;
  reviewer: number;
  status: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
}

export interface FileDiff {
  file_path: string;
  status: "modified" | "added" | "removed";
  diff: string[];
  additions: number;
  deletions: number;
}

export type PullRequestAction = "merge" | "close" | "reopen" | "approve";
