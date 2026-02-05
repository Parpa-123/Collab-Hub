import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import type { RepoStruct } from '../Profile Components/UserProfile';
import connect from '../../axios/connect';

const MainLayout = () => {
  const { slug } = useParams();
  const [repo, setRepo] = useState<RepoStruct | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await connect.get(`/repositories/${slug}`);
        setRepo(res.data);
      } catch (error) {
        console.error('Error fetching repository:', error);
      }
    })();
  }, [slug]);

  return (
    <div className="bg-white min-h-screen">

      {/* Repository header (optional but useful) */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">
          {repo?.name || "repository"}
        </h1>
        {repo?.description && (
          <p className="text-sm text-gray-600 mt-1">
            {repo.description}
          </p>
        )}
      </div>

      {/* GitHub-style tab navigation */}
      <nav className="px-6 border-b border-gray-200">
        <ul className="flex gap-6 text-sm text-gray-700">
          <NavLink
            to="."
            end
            className={({ isActive }) =>
              `py-3 border-b-2 ${
                isActive
                  ? "border-orange-500 text-gray-900"
                  : "border-transparent hover:text-gray-900"
              }`
            }
          >
            Code
          </NavLink>

          <NavLink
            to="branches"
            className={({ isActive }) =>
              `py-3 border-b-2 ${
                isActive
                  ? "border-orange-500 text-gray-900"
                  : "border-transparent hover:text-gray-900"
              }`
            }
          >
            Branches
          </NavLink>

          <NavLink
            to="pullrequests"
            className={({ isActive }) =>
              `py-3 border-b-2 ${
                isActive
                  ? "border-orange-500 text-gray-900"
                  : "border-transparent hover:text-gray-900"
              }`
            }
          >
            Pull requests
          </NavLink>

          <NavLink
            to="issues"
            className={({ isActive }) =>
              `py-3 border-b-2 ${
                isActive
                  ? "border-orange-500 text-gray-900"
                  : "border-transparent hover:text-gray-900"
              }`
            }
          >
            Issues
          </NavLink>
        </ul>
      </nav>

      <Outlet />
    </div>
  );
};

export default MainLayout;
