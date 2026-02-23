import { useContext, useState } from "react"
import { userContext } from "../../Context/userContext"
import { useSearchParams } from "react-router-dom"
import ProfileDetailNav from "./ProfileDetailNav"
import UpdateProfile from "./UpdateProfile"
import ProfileDetails from "./ProfileDetails"
import ProfileRepositories from "./ProfileRepositories"
import connect from "../../axios/connect";
import { useEffect } from "react";

export interface RepoStruct {
  name: string;
  description: string;
  visibility: string;
  slug?: string;
  my_role?: string | null;
}

const UserProfile = () => {
  const { login } = useContext(userContext)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [repos, setRepos] = useState<RepoStruct[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await connect.get('/repositories/');
        setRepos(res.data);
      } catch (error) {
        console.error('Error fetching repositories:', error);
      }
    })();
  }, []);

  if (!login) return null

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">

        <ProfileDetailNav />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">

          {/* Left column */}
          <div className="md:col-span-1">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-semibold text-gray-500">
                  {login.first_name?.[0]}
                </div>

                <h1 className="mt-4 text-xl font-semibold text-gray-900">
                  {login.first_name} {login.last_name}
                </h1>

                <p className="text-sm text-gray-600 mt-1">
                  {login.email}
                </p>

                {login.bio && (
                  <p className="text-sm text-gray-700 mt-4 text-center">
                    {login.bio}
                  </p>
                )}

                {isEditing ? <UpdateProfile setIsEditing={setIsEditing} /> : <button className="mt-4 w-full border border-gray-300 rounded-md py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition" onClick={() => setIsEditing(true)}>
                  Edit profile
                </button>}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-3">
            {tab === "overview" && <ProfileDetails repos={repos.length} />}
            {tab === "repositories" && <ProfileRepositories repos={repos} />}
          </div>
        </div>

      </div>
    </div>
  )
}

export default UserProfile
