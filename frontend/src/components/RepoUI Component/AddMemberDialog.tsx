import React from "react";
import type { SearchUser } from "./MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  loading: boolean;
  hasSearched: boolean;
  searchResult: SearchUser[];
  selectedUser: SearchUser | null;
  onSelectUser: (user: SearchUser) => void;
  selectedRole: string;
  onSelectedRoleChange: (role: string) => void;
  onAddMember: () => void;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  loading,
  hasSearched,
  searchResult,
  selectedUser,
  onSelectUser,
  selectedRole,
  onSelectedRoleChange,
  onAddMember,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add repository member</DialogTitle>
          <DialogDescription>
            Search and select a user to add to this repository.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && onSearch()}
        />

        <ScrollArea className="h-64 border rounded-md p-2">
          {loading ? (
            <p className="text-sm text-gray-500 text-center mt-4">Searching...</p>
          ) : !hasSearched ? (
            <p className="text-sm text-gray-500 text-center mt-4">Start typing to search users</p>
          ) : searchResult.length === 0 ? (
            <p className="text-sm text-gray-500 text-center mt-4">No users found</p>
          ) : (
            <div className="space-y-2">
              {searchResult.map((user) => {
                const displayName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;
                const fallbackInitial = displayName[0]?.toUpperCase() || "U";

                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedUser?.id === user.id ? "bg-gray-100 border" : "hover:bg-gray-50"
                      }`}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {fallbackInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Select value={selectedRole} onValueChange={onSelectedRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!selectedUser} onClick={onAddMember}>Add member</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
