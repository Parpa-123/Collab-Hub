import { useContext, useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { userContext } from "../Context/userContext"
import connect from "../axios/connect"
import AuthDialog from "../components/Header Components/AuthHeader"

import logo from "../assets/svg-ai-collabhub-2026-01-23.svg"

const Header = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const { login, setLogin } = useContext(userContext)

  useEffect(() => {
    if (!login) setIsAuthOpen(true)
  }, [login])

  const handleRegister = async (formData: FormData) => {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    if (password !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    try {
      await connect.post("accounts/register/", {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      })

      // After successful signup → go to login form
      setIsAuthOpen(true)
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogin = async (formData: FormData) => {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const res = await connect.post("accounts/login/", { email, password })

      localStorage.setItem("accessToken", res.data.access)
      localStorage.setItem("refreshToken", res.data.refresh)

      setLogin(true)
      setIsAuthOpen(false)
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
          <img src={logo} alt="CollabHub Logo" className="h-20 w-auto" />

          <div className="flex items-center gap-3">
            {!login ? (
              <AuthDialog
                isOpen={isAuthOpen}
                setIsOpen={setIsAuthOpen}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
                loginWithGoogle={loginWithGoogle}
                loginWithMicrosoft={loginWithMicrosoft}
              />
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
