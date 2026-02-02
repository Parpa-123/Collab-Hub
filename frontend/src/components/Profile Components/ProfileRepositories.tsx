import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"
import type { RepoStruct } from "./UserProfile";






const ProfileRepositories = ({ repos }: { repos: RepoStruct[] }) => {
    const nav = useNavigate();
    return (
        <div className="py-6">
            <div className="flex flex-col sm:flex-row gap-4 border-b pb-4 border-gray-200">
                <input
                    type="search"
                    name="search"
                    id="search"
                    placeholder="Find a repository..."
                    className="grow rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <div className="flex gap-2">
                    <select
                        name="type"
                        id="type"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">Type: All</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>

                    </select>

                    <select name="membership" id="membership" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="owner">Owner</option>
                        <option value="maintainer">Maintainer</option>
                        <option value="viewer">Viewer</option>
                    </select>



                    <select
                        name="sort"
                        id="sort"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        defaultValue="last_updated"
                    >
                        <option value="last_updated">Sort: Last updated</option>
                        <option value="name">Name</option>
                        <option value="stars">Stars</option>
                    </select>

                    <button onClick={() => nav('/new')} className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2">
                        <span>New</span>
                    </button>
                </div>
            </div>

            <div className="divide-y divide-gray-200">
                {repos.map((repo) => (
                    <div key={repo.name} className="py-6 first:pt-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <a href="#" className="text-xl font-semibold text-blue-600 hover:underline">
                                    {repo.name}
                                </a>
                                <span className={`px-2 py-0.5 text-xs border rounded-full font-medium ${repo.visibility === 'public'
                                        ? 'border-green-500 text-green-700'
                                        : 'border-yellow-500 text-yellow-700'
                                    }`}>
                                    {repo.visibility.charAt(0).toUpperCase() + repo.visibility.slice(1)}
                                </span>
                            </div>
                        </div>
                        {repo.description && (
                            <p className="mt-2 text-gray-600 text-sm max-w-3xl">
                                {repo.description}
                            </p>
                        )}
                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                            {/* Placeholder for language and update time if available later */}
                            {/* <span>Updated recently</span> */}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    )
}

export default ProfileRepositories
