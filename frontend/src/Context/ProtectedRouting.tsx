import React, { useContext } from 'react'
import { userContext } from './userContext'
import { Navigate } from 'react-router-dom'

const ProtectedRouting = ({ children }: { children: React.ReactNode }) => {
    const { login, isLoading } = useContext(userContext);

    if (isLoading) {
        return <div>Loading...</div>; // Or a proper loading spinner component
    }

    return (
        <>
            {login ? children : <Navigate to="/" />}
        </>
    )
}

export default ProtectedRouting