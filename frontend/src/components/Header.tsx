import { useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import HeaderDialog from './Header Components/HeaderDialog'
import { userContext } from '../Context/userContext'
import connect from '../axios/connect'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle, faMicrosoft } from "@fortawesome/free-brands-svg-icons";


const Header = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const [isLoginOpen, setIsLoginOpen] = useState(false)

    const { login, setLogin } = useContext(userContext)

    useEffect(() => {
        if (!login) {
            setIsRegisterOpen(true)
        }
    }, [login])

    const handleRegister = async (formData: FormData) => {
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string
        const firstName = formData.get('firstName') as string
        const lastName = formData.get('lastName') as string

        if (password !== confirmPassword) {
            alert('Passwords do not match')
            return
        }

        const data = {
            email,
            password,
            first_name: firstName,
            last_name: lastName,
        }

        try {
            await connect.post('accounts/register/', data)
            setIsRegisterOpen(false)
            setIsLoginOpen(true)
        } catch (error) {
            console.error(error)
        }
    }

    const handleLogin = async (formData: FormData) => {
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            const res = await connect.post('accounts/login/', {
                email,
                password,
            })

            localStorage.setItem('accessToken', res.data.access)
            localStorage.setItem('refreshToken', res.data.refresh)

            setLogin(true)
            setIsLoginOpen(false)
        } catch (error) {
            console.error(error)
        }
    }

    const loginWithGoogle = () => {
    window.location.href = "http://localhost:8000/api/auth/google/login/"
  }

  const loginWithMicrosoft = () => {
    window.location.href = "http://localhost:8000/api/auth/microsoft/login/"
  }

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <span className="text-xl font-bold tracking-tight text-foreground/90">
                        Logo
                    </span>

                    <div className="flex items-center gap-3">
                        {!login ? (
                            <>
                                <HeaderDialog
                                    trigger={
                                        <button className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
                                            Login
                                        </button>
                                    }
                                    title="Sign In"
                                    description="Access your account to continue."
                                    open={isLoginOpen}
                                    onOpenChange={setIsLoginOpen}
                                >
                                    <form action={handleLogin} className="grid gap-4 py-2">
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Email"
                                            required
                                            className="h-10 w-full rounded-md border px-3 text-sm"
                                        />
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="Password"
                                            required
                                            className="h-10 w-full rounded-md border px-3 text-sm"
                                        />
                                        <button className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium">
                                            Login
                                        </button>

                                        <button type="button" onClick={loginWithGoogle}>
                                            <FontAwesomeIcon icon={faGoogle} /> Google
                                        </button>

                                        <button type="button" onClick={loginWithMicrosoft}>
                                            <FontAwesomeIcon icon={faMicrosoft} /> Microsoft
                                        </button>
                                    </form>
                                </HeaderDialog>

                                <HeaderDialog
                                    trigger={
                                        <button className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                            Register
                                        </button>
                                    }
                                    title="Get Started"
                                    description="Enter your details to create an account."
                                    open={isRegisterOpen}
                                    onOpenChange={setIsRegisterOpen}
                                >
                                    <form action={handleRegister} className="grid gap-4 py-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                name="firstName"
                                                placeholder="First Name"
                                                required
                                                className="h-10 w-full rounded-md border px-3 text-sm"
                                            />
                                            <input
                                                type="text"
                                                name="lastName"
                                                placeholder="Last Name"
                                                required
                                                className="h-10 w-full rounded-md border px-3 text-sm"
                                            />
                                        </div>

                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Email"
                                            required
                                            className="h-10 w-full rounded-md border px-3 text-sm"
                                        />
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="Password"
                                            required
                                            className="h-10 w-full rounded-md border px-3 text-sm"
                                        />
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            placeholder="Confirm Password"
                                            required
                                            className="h-10 w-full rounded-md border px-3 text-sm"
                                        />

                                        <button className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium">
                                            Register
                                        </button>
                                    </form>
                                </HeaderDialog>
                            </>
                        ) : (
                            <button className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                Hello
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <Outlet />
        </>
    )
}

export default Header
