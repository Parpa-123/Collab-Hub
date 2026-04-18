import { useState } from "react"
import HeaderDialog from "./HeaderDialog"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGoogle, faMicrosoft } from "@fortawesome/free-brands-svg-icons"

type Mode = "provider" | "login" | "register"

interface AuthDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  handleLogin: (formData: FormData) => Promise<void>
  handleRegister: (formData: FormData) => Promise<void>
  loginWithGoogle: () => void
  loginWithMicrosoft: () => void
}

const AuthDialog = ({
  isOpen,
  setIsOpen,
  handleLogin,
  handleRegister,
  loginWithGoogle,
  loginWithMicrosoft,
}: AuthDialogProps) => {

  const [mode, setMode] = useState<Mode>("provider")

  return (
    <HeaderDialog
      trigger={
        <button className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
          Login / Signup
        </button>
      }
      title={
        mode === "provider"
          ? "Welcome"
          : mode === "login"
          ? "Sign In"
          : "Create account"
      }
      description={
        mode === "provider"
          ? "Choose how you want to continue"
          : mode === "login"
          ? "Login using your email"
          : "Sign up using your email"
      }
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setMode("provider")
      }}
    >

      {/* STEP 1 — PROVIDER */}
      {mode === "provider" && (
        <div className="grid gap-3 py-4">
          <button
            onClick={() => setMode("login")}
            className="h-10 w-full rounded-md border text-sm font-medium"
          >
            Continue with Email
          </button>

          <button
            onClick={loginWithGoogle}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium"
          >
            <FontAwesomeIcon icon={faGoogle} />
            Continue with Google
          </button>

          <button
            onClick={loginWithMicrosoft}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium"
          >
            <FontAwesomeIcon icon={faMicrosoft} />
            Continue with Microsoft
          </button>
        </div>
      )}

      {/* STEP 2 — LOGIN */}
      {mode === "login" && (
        <>
          <form action={handleLogin} className="grid gap-4 py-2">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
            />

            <button className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium">
              Login
            </button>
          </form>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Don’t have an account?
            <button
              type="button"
              onClick={() => setMode("register")}
              className="ml-1 font-medium text-primary"
            >
              Sign up
            </button>
          </p>
        </>
      )}

      {/* STEP 3 — REGISTER */}
      {mode === "register" && (
        <>
          <form action={handleRegister} className="grid gap-4 py-2">
            <div className="flex gap-2">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                required
                className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                required
                className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              required
              className="h-10 w-full rounded-md border px-3 text-sm bg-background text-foreground"
            />

            <button className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium">
              Create account
            </button>
          </form>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Already have an account?
            <button
              type="button"
              onClick={() => setMode("login")}
              className="ml-1 font-medium text-primary"
            >
              Login
            </button>
          </p>
        </>
      )}

    </HeaderDialog>
  )
}

export default AuthDialog
