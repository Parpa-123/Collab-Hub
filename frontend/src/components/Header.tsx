import { useContext, useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { userContext } from "../Context/userContext"
import connect from "../axios/connect"
import AuthDialog from "../components/Header Components/AuthHeader"
import NotificationPanel from "../components/Header Components/NotificationPanel"

import logo from "../assets/svg-ai-collabhub-2026-01-23.svg"
import { errorToast, successToast } from "../lib/toast"
import { useTheme } from "../Context/ThemeContext"
import { Sun, Moon, Laptop, ChevronDown, User, LogOut, BookOpen } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const Header = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const { login, setLogin } = useContext(userContext)
  const { theme, setTheme } = useTheme()
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)

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

  const handleSignOut = async () => {
    try {
      await connect.post("accounts/logout/")
    } catch {
      // best-effort — clear client state regardless
    } finally {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      setLogin(null)
      setIsSignOutOpen(false)
    }
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
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-accent text-muted-foreground flex items-center gap-1 transition-colors">
                      {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Laptop size={18} />}
                      <ChevronDown size={14} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-1" align="end">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => setTheme('light')}
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent ${theme === 'light' ? 'bg-accent' : ''}`}
                      >
                        <Sun size={14} /> Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent ${theme === 'dark' ? 'bg-accent' : ''}`}
                      >
                        <Moon size={14} /> Dark
                      </button>
                      <button 
                        onClick={() => setTheme('system')}
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent ${theme === 'system' ? 'bg-accent' : ''}`}
                      >
                        <Laptop size={14} /> System
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                <NotificationPanel isLoggedIn={!!login} />
                
                {/* User Menu Trigger */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
                      {login.first_name} {login.last_name}
                      <ChevronDown size={14} />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent className="w-52 p-1" align="end">
                    {/* User info header */}
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-sm font-medium text-foreground">{login.first_name} {login.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{login.email}</p>
                    </div>

                    {/* Profile link */}
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors">
                      <User size={14} /> Profile
                    </Link>

                    {/* Repositories link */}
                    <Link to="/repositories" className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors">
                      <BookOpen size={14} /> Repositories
                    </Link>

                    <div className="border-t border-border mt-1 pt-1">
                      {/* Sign out — opens Dialog */}
                      <button
                        onClick={() => setIsSignOutOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-destructive/10 text-destructive w-full transition-colors"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Sign out confirmation Dialog */}
                <Dialog open={isSignOutOpen} onOpenChange={setIsSignOutOpen}>
                  <DialogContent showCloseButton={false} className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Sign out?</DialogTitle>
                      <DialogDescription>
                        You'll be signed out of your account and returned to the home screen.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <button 
                        onClick={() => setIsSignOutOpen(false)} 
                        className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent border border-input transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSignOut} 
                        className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                      >
                        Sign out
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
