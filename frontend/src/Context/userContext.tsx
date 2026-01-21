import React, { createContext, type Dispatch, type SetStateAction } from 'react'

interface UserContextType {
    login: boolean;
    setLogin: Dispatch<SetStateAction<boolean>>;
}

const userContext = createContext<UserContextType>({ login: false, setLogin: () => { } });

const UserContextProvider = ({ children }: { children: React.ReactNode }) => {

    const [login, setLogin] = React.useState<boolean>(!!localStorage.getItem('accessToken'));



    return (
        <userContext.Provider value={{ login, setLogin }}>
            {children}
        </userContext.Provider>
    )
}

export { userContext, UserContextProvider };