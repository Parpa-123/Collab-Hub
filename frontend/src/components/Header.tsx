import { useContext, useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { userContext } from "../Context/userContext"
import connect from "../axios/connect"
import AuthDialog from "../components/Header Components/AuthHeader"
import NotificationPanel from "../components/Header Components/NotificationPanel"

import logo from "../assets/svg-ai-collabhub-2026-01-23.svg"
import { errorToast, successToast } from "../lib/toast"

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
      errorToast(new Error("Passwords do not match"))
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
      successToast("Registration successful! Please login.")
      setIsAuthOpen(true)
    } catch (error) {
      errorToast(error, "Registration failed")
    }
  }

  const handleLogin = async (formData: FormData) => {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const res = await connect.post("accounts/login/", { email, password })

      localStorage.setItem("accessToken", res.data.access)
      localStorage.setItem("refreshToken", res.data.refresh)

      if (res.data.user) {
        setLogin(res.data.user)
      } else {
        // Fallback or handle missing user
        setLogin(res.data)
      }
      successToast("Login successful!")
      setIsAuthOpen(false)
    } catch (error) {
      errorToast(error, "Login failed")
    }
  }

  const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI || "http://localhost:5173/auth/callback"

  const loginWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: "google",
      access_type: "online",
      prompt: "select_account",
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const loginWithMicrosoft = () => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile User.Read",
      state: "microsoft",
      prompt: "select_account",
    })
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
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
              <>
                <NotificationPanel isLoggedIn={!!login} />
                <button className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {login.first_name} {login.last_name}
                </button>
              </>
            )}
          </div>
        </div>
      </header >

      <Outlet />
    </>
  )
}

export default Header
