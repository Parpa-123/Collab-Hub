import React, { useContext } from 'react'
import connect from '../../axios/connect'
import { userContext } from '../../Context/userContext'
import { useNavigate } from 'react-router-dom'

interface UpdateProfileProps {
    setIsEditing: (isEditing: boolean) => void
}

const UpdateProfile = ({ setIsEditing }: UpdateProfileProps) => {
    const { login } = useContext(userContext);
    const navigate = useNavigate(); 

    const handleUpdateProfile = async (formData: FormData) => {
        const { firstName, lastName, email, bio } = Object.fromEntries(formData);

        try {
            const res = await connect.patch('/accounts/register/', {
                first_name: firstName,
                last_name: lastName,
                email: email,
                bio: bio
            })
            console.log("Profile updated successfully", res.data)
            
            navigate(0);
        } catch (error) {
            console.log(error)
        }
    }
    return (
        <form action={handleUpdateProfile} className="mt-4 space-y-3">
            <div className="space-y-1">
                <label htmlFor="firstName" className="text-xs font-medium text-gray-700">First Name</label>
                <input type="text" name="firstName" placeholder="First Name" required
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    defaultValue={login?.first_name || ""}
                />
            </div>
            <div className="space-y-1">
                <label htmlFor="lastName" className="text-xs font-medium text-gray-700">Last Name</label>
                <input type="text" name="lastName" placeholder="Last Name" required
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    defaultValue={login?.last_name || ""}
                />
            </div>
            <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium text-gray-700">Email</label>
                <input type="email" name="email" placeholder="Email" required
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    defaultValue={login?.email || ""}
                />
            </div>
            <div className="space-y-1">
                <label htmlFor="bio" className="text-xs font-medium text-gray-700">Bio</label>
                <textarea name="bio" placeholder="Bio" rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                    defaultValue={login?.bio || ""}
                />
            </div>
            <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 rounded-md bg-gray-900 py-1.5 text-sm font-medium text-white hover:bg-gray-800 transition">Save</button>
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 rounded-md border border-gray-300 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
            </div>
        </form>
    )
}

export default UpdateProfile