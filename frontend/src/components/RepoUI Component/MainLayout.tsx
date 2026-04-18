import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import connect from "../../axios/connect";
import { errorToast, successToast } from "../../lib/toast";
import type { RepoStruct } from "../Profile Components/UserProfile";
import type { User } from "../../Context/userContext";
import NotFound from "../../404 section/404";
import { Button } from "@/components/ui/button";
import MembersListDialog from "./MembersListDialog";
import AddMemberDialog from "./AddMemberDialog";

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

const MainLayout = () => {
  const { slug } = useParams();

  const [repo, setRepo] = useState<RepoStruct | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
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
    } catch (err: any) {
      errorToast(err, "Failed to load repository");
      if (err.response?.status === 404) {
        setIsNotFound(true);
      }
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/members/`);
      setMembers(res.data.results ?? res.data);
    } catch (err) {
      errorToast(err, "Failed to load members");
    }
  };

  const fetchMyRole = async () => {
    try {
      const res = await connect.get(`/repositories/${slug}/my-role/`);
      setMyRole(res.data.role);
    } catch (err) {
      errorToast(err, "Failed to load your role");
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
      setSearchResult(res.data.results ?? res.data);
    } catch (err) {
      errorToast(err, "Failed to search users");
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
      successToast("Member added successfully!");
      fetchMembers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.non_field_errors?.[0] || error.response?.data?.message || "Failed to add member";
      errorToast(error, errorMsg);
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

  if (isNotFound) {
    return <NotFound />;
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Repository Header */}
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {repo?.name || "repository"}
          </h1>
          {repo?.description && (
            <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Clickable member count */}
          <button
            onClick={() => showMembersModal(true)}
            className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            {members.length} {members.length === 1 ? "member" : "members"}
          </button>
          <Button variant="outline" onClick={() => showModal(true)}>
            Add member
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="px-6 border-b border-border">
        <ul className="flex gap-6 text-sm text-muted-foreground">
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
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent hover:text-foreground hover:border-border"
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
      <MembersListDialog
        open={membersModal}
        onOpenChange={showMembersModal}
        members={members}
        isAdmin={isAdmin}
        roleError={roleError}
        updatingMemberId={updatingMemberId}
        onRoleChange={handleRoleChange}
      />

      {/* ── ADD MEMBER DIALOG ── */}
      <AddMemberDialog
        open={modal}
        onOpenChange={showModal}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        loading={loading}
        searchResult={searchResult}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        selectedRole={selectedRole}
        onSelectedRoleChange={setSelectedRole}
        onAddMember={handleAddMember}
      />
    </div>
  );
};

export default MainLayout;
