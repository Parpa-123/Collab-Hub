import { Bell, CircleDot, GitPullRequest, Globe, Lock } from "lucide-react";

export function getGreeting(): string {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return "Good morning";
  }
  if (currentHour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function renderVisibilityIcon(visibility: string) {
  return visibility === "public" ? (
    <Globe className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
  ) : (
    <Lock className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
  );
}

export function renderNotificationIcon(type: string | undefined) {
  switch (type) {
    case "PullRequest":
      return <GitPullRequest className="w-4 h-4 text-primary" />;
    case "Issue":
      return <CircleDot className="w-4 h-4 text-green-600 dark:text-green-500" />;
    default:
      return <Bell className="w-4 h-4 text-primary" />;
  }
}
