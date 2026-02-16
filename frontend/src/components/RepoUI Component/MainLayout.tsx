import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import connect from "../../axios/connect";
import type { RepoStruct } from "../Profile Components/UserProfile";
import type { User } from "../../Context/userContext";

// Extended User interface with bio for search results
export interface SearchUser extends User {
  id: number;
  bio?: string;
}

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

const MainLayout = () => {
  const { slug } = useParams();

  const [repo, setRepo] = useState<RepoStruct | null>(null);
  const [modal, showModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<SearchUser[]>([]);
  // Fetch repository
  useEffect(() => {
    (async () => {
      try {
        const res = await connect.get(`/repositories/${slug}`);
        setRepo(res.data);
      } catch (error) {
        console.error("Error fetching repository:", error);
      }
    })();
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        const res = await connect.get(`/repositories/${slug}/members/`);
        setMembers(res.data);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    })();
  }, [slug]);

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const res = await connect.get(`/repositories/${slug}/search-users/?search=${searchQuery}`);
      setSearchResult(res.data);
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add selected member
  const handleAddMember = async () => {
    if (!selectedUser) return;

    try {
      await connect.post(`/repositories/${slug}/add-member/`, {
        developer: selectedUser.id,
        role: selectedRole,
      });

      // Remove added user from list
      setSearchResult((prev) =>
        prev.filter((u) => u.id !== selectedUser.id)
      );

      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error adding member:", error);
      alert(error.response?.data?.non_field_errors?.[0] || error.response?.data?.message || "Failed to add member");
    }
  };

  return (
    <div className="bg-white min-h-screen">

      {/* Repository Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {repo?.name || "repository"}
          </h1>
          {repo?.description && (
            <p className="text-sm text-gray-600 mt-1">
              {repo.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
          <Button variant="outline" onClick={() => showModal(true)}>
            Add member
          </Button>
        </div>
      </div>

      {/* GitHub-style Tabs */}
      <nav className="px-6 border-b border-gray-200">
        <ul className="flex gap-6 text-sm text-gray-700">
          {[
            { to: ".", label: "Code", end: true },
            { to: "branches", label: "Branches" },
            { to: "pullrequests", label: "Pull requests" },
            { to: "issues", label: "Issues" },
          ].map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `py-3 border-b-2 ${isActive
                  ? "border-orange-500 text-gray-900"
                  : "border-transparent hover:text-gray-900"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </ul>
      </nav>

      <Outlet />

      {/* ADD MEMBER DIALOG */}
      <Dialog open={modal} onOpenChange={showModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add repository member</DialogTitle>
            <DialogDescription>
              Search and select a user to add to this repository.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSearch()}
          />

          {/* Search Results */}
          <ScrollArea className="h-64 border rounded-md p-2">
            {loading ? (
              <p className="text-sm text-gray-500 text-center mt-4">
                Searching...
              </p>
            ) : searchResult.length === 0 ? (
              <p className="text-sm text-gray-500 text-center mt-4">
                No users found
              </p>
            ) : (
              <div className="space-y-2">
                {searchResult.map((user) => (
                  <div
                    key={user.pk}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedUser?.pk === user.pk
                      ? "bg-gray-100 border"
                      : "hover:bg-gray-50"
                      }`}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="text-sm font-medium">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Role Selector */}
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="maintainer">Maintainer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => showModal(false)}>
              Cancel
            </Button>

            <Button
              disabled={!selectedUser}
              onClick={handleAddMember}
            >
              Add member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout;
