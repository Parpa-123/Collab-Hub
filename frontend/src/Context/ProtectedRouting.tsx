import React, { useContext } from 'react'
import { userContext } from './userContext'
import { Navigate, Outlet } from 'react-router-dom'

const ProtectedRouting = ({ children }: { children: React.ReactNode }) => {
    const { login } = useContext(userContext);
    return (
        <>
            {login ? children : <Navigate to="/" />}
        </>
    )
}

export default ProtectedRouting