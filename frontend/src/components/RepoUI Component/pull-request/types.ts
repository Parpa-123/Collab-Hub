export interface Branch {
  id: number;
  name: string;
}

export interface PullRequest {
  id: number;
  title: string;
  status: "OPEN" | "CLOSED" | "MERGED";
  source_name: string;
  target_name: string;
  created_by: number;
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
}

export type PullRequestAction = "merge" | "close" | "reopen";
