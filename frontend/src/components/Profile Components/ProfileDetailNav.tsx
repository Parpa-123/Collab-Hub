
import { NavLink, useSearchParams } from "react-router-dom"


const ProfileDetailNav = () => {
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "overview";

    const linkClass = (tab: string) =>
        `pb-3 text-sm font-medium ${activeTab === tab
            ? "text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        }`;

    return (
        <>
            <nav className="border-b border-gray-200">
                <ul className="flex gap-6">
                    <li>
                        <NavLink
                            to="?tab=overview"
                            className={linkClass("overview")}
                        >
                            Overview
                        </NavLink>
                    </li>

                    <li>
                        <NavLink
                            to="?tab=repositories"
                            className={linkClass("repositories")}
                        >
                            Repositories
                        </NavLink>
                    </li>
                </ul>
            </nav>
        </>
    )
}

export default ProfileDetailNav