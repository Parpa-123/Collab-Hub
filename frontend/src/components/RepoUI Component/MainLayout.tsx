import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import connect from "../../axios/connect";
import type { RepoStruct } from "../Profile Components/UserProfile";
import type { User } from "../../Context/userContext";

export interface SearchUser extends User {
  id: number;
  bio?: string;
}

interface Member {
  member_id: number;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
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

const MainLayout = () => {
  const { slug } = useParams();

  const [repo, setRepo] = useState<RepoStruct | null>(null);
  const [modal, showModal] = useState(false);
  const [membersModal, showMembersModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

  const fetchRepo = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/`);
      setRepo(res.data);
    } catch (err) {
      console.error("Error fetching repository:", err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/members/`);
      setMembers(res.data);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const fetchMyRole = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/my-role/`);
      setMyRole(res.data.role);
    } catch (err) {
      console.error("Error fetching role:", err);
    }
  };

  useEffect(() => {
    fetchRepo();
    fetchMembers();
    fetchMyRole();
  }, [slug]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const res = await connect.get(`/repositories/${slug}/search-users/?search=${searchQuery}`);
      setSearchResult(res.data);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    try {
      await connect.post(`/repositories/${slug}/add-member/`, {
        developer: selectedUser.id,
        role: selectedRole,
      });
      setSearchResult((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setSelectedUser(null);
      fetchMembers();
    } catch (error: any) {
      console.error("Error adding member:", error);
      alert(error.response?.data?.non_field_errors?.[0] || error.response?.data?.message || "Failed to add member");
    }
  };

  const handleRoleChange = async (memberId: number, newRole: string) => {
    setRoleError(null);
    setUpdatingMemberId(memberId);
    try {
      await connect.patch(`/repositories/${slug}/members/${memberId}/role/`, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.member_id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (error: any) {
      setRoleError(error.response?.data?.message || "Failed to update role.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const isAdmin = myRole === "admin";

  return (
    <div className="bg-white min-h-screen">
      {/* Repository Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {repo?.name || "repository"}
          </h1>
          {repo?.description && (
            <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Clickable member count */}
          <button
            onClick={() => showMembersModal(true)}
            className="text-sm text-gray-600 hover:text-blue-600 hover:underline transition-colors"
          >
            {members.length} {members.length === 1 ? "member" : "members"}
          </button>
          <Button variant="outline" onClick={() => showModal(true)}>
            Add member
          </Button>
        </div>
      </div>

      {/* Tabs */}
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

      {/* ── MEMBER LIST DIALOG ── */}
      <Dialog open={membersModal} onOpenChange={showMembersModal}>
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
                    onValueChange={(newRole: string) => handleRoleChange(member.member_id, newRole)}
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
            <Button variant="outline" onClick={() => showMembersModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ADD MEMBER DIALOG ── */}
      <Dialog open={modal} onOpenChange={showModal}>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSearch()}
          />

          <ScrollArea className="h-64 border rounded-md p-2">
            {loading ? (
              <p className="text-sm text-gray-500 text-center mt-4">Searching...</p>
            ) : searchResult.length === 0 ? (
              <p className="text-sm text-gray-500 text-center mt-4">No users found</p>
            ) : (
              <div className="space-y-2">
                {searchResult.map((user) => (
                  <div
                    key={user.pk}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedUser?.pk === user.pk ? "bg-gray-100 border" : "hover:bg-gray-50"
                      }`}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
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
            <Button variant="outline" onClick={() => showModal(false)}>Cancel</Button>
            <Button disabled={!selectedUser} onClick={handleAddMember}>Add member</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout;
