import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "member", label: "Member" },
  { value: "maintainer", label: "Maintainer" },
  { value: "admin", label: "Admin" },
];

const roleBadgeClass: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  maintainer: "bg-blue-100 text-blue-700",
  member: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-600",
};

interface Member {
  member_id: number;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface MembersListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  isAdmin: boolean;
  roleError: string | null;
  updatingMemberId: number | null;
  onRoleChange: (memberId: number, newRole: string) => void;
}

const MembersListDialog: React.FC<MembersListDialogProps> = ({
  open,
  onOpenChange,
  members,
  isAdmin,
  roleError,
  updatingMemberId,
  onRoleChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Repository members</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "As an admin, you can change member roles."
              : "Viewing repository members. Only admins can change roles."}
          </DialogDescription>
        </DialogHeader>

        {roleError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {roleError}
          </p>
        )}

        <ScrollArea className="h-72 border rounded-md divide-y">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {member.first_name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
              </div>

              {isAdmin ? (
                <Select
                  value={member.role}
                  onValueChange={(newRole: string) => onRoleChange(member.member_id, newRole)}
                  disabled={updatingMemberId === member.member_id}
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass[member.role] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {member.role}
                </span>
              )}
            </div>
          ))}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembersListDialog;
