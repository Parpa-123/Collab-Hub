import React, { createContext, useEffect, type Dispatch, type SetStateAction } from 'react'
import connect, { AUTH_EXPIRED_EVENT } from '../axios/connect';

interface UserContextType {
    login: User | null;
    setLogin: Dispatch<SetStateAction<User | null>>;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

export interface User {
    pk: number;
    email: string;
    first_name: string;
    last_name: string;
    username?: string;
    bio?: string;
}


const userContext = createContext<UserContextType>({ login: null, setLogin: () => { }, refreshUser: () => Promise.resolve(), isLoading: true });

const UserContextProvider = ({ children }: { children: React.ReactNode }) => {

    const [login, setLogin] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    const refreshLogin = async () => {
        setIsLoading(true);
        try {
            const res = await connect.get('accounts/me/', {
                withCredentials: true
            });
            if (res.status === 200) {
                setLogin(res.data)
            } else {
                setLogin(null)
            }
        } catch (error) {
            setLogin(null)
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshLogin();

        const handleAuthExpired = () => {
            setLogin(null);
            setIsLoading(false);
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

        return () => {
            window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        };
    }, []);



    return (
        <userContext.Provider value={{ login, setLogin, refreshUser: refreshLogin, isLoading }}>
            {children}
        </userContext.Provider>
    )
}

export { userContext, UserContextProvider };
