

const ProfileDetails = () => {
    return (
        <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900">
                Overview
            </h2>

            <p className="mt-2 text-sm text-gray-600">
                Welcome to your profile. This is where your public information
                will appear, just like GitHub.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                    <p className="text-sm text-gray-600">Repositories</p>
                </div>

                <div className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                    <p className="text-sm text-gray-600">Followers</p>
                </div>

                <div className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                    <p className="text-sm text-gray-600">Following</p>
                </div>
            </div>
        </div>
    )
}

export default ProfileDetails
