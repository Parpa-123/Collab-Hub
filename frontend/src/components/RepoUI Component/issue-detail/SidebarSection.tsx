import type { ReactNode } from "react";

interface SidebarSectionProps {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}

export default function SidebarSection({ children, icon, title }: SidebarSectionProps) {
  return (
    <div className="border-b border-gray-100 pb-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
