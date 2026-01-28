

const ProfileRepositories = () => {
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

                    <button className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2">
                        <span>New</span>
                    </button>
                </div>
            </div>

            <div className="divide-y divide-gray-200">
                
            </div>

        </div>
    )
}

export default ProfileRepositories
