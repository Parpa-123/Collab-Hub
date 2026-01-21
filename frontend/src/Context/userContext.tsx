import React, { createContext, useEffect, type Dispatch, type SetStateAction } from 'react'
import connect from '../axios/connect';

interface UserContextType {
    login: boolean;
    setLogin: Dispatch<SetStateAction<boolean>>;
    refreshUser: () => Promise<void>;
}

const userContext = createContext<UserContextType>({ login: false, setLogin: () => { }, refreshUser: () => Promise.resolve() });

const UserContextProvider = ({ children }: { children: React.ReactNode }) => {

    const [login, setLogin] = React.useState<boolean>(false);

    const refreshLogin = async () => {
        try {
            const res = await connect.get('accounts/me/',{
                withCredentials: true
            });
            if (res.status === 200) {
                setLogin(true)
            }else{
                setLogin(false)
            }
        } catch (error) {
            setLogin(false)
        }
    };  

    useEffect(() => {
        refreshLogin();
    }, []);



    return (
        <userContext.Provider value={{ login, setLogin, refreshUser: refreshLogin }}>
            {children}
        </userContext.Provider>
    )
}

export { userContext, UserContextProvider };