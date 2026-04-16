export interface Repo {
  name: string;
  description: string;
  visibility: string;
  slug: string;
  my_role: string | null;
}

export interface NotificationContentObject {
  id: number;
  type: string;
  name: string;
}

export interface NotificationItem {
  id: number;
  actor_name: string;
  verb: string;
  content_object: NotificationContentObject | null;
  is_read: boolean;
  created_at: string;
}
