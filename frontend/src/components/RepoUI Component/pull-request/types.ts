export interface PullRequestUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface PullRequest {
  id: number;
  title: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  is_draft: boolean;
  source_name: string;
  target_name: string;
  created_by: number;
  created_by_detail?: PullRequestUser | null;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
}

export interface Review {
  id: number;
  reviewer: number;
  status: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
}

export interface PullRequestFormState {
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  is_draft: boolean;
}

export type PullRequestAction =
  | "merge"
  | "close"
  | "reopen"
  | "ready-for-review"
  | "convert-to-draft";
