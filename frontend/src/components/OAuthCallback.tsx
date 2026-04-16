import { useEffect, useRef, useContext } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { userContext } from "../Context/userContext"
import connect from "../axios/connect"
import { errorToast, warningToast } from "../lib/toast"


const OAuthCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setLogin } = useContext(userContext)
  const hasRun = useRef(false)

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (hasRun.current) return
    hasRun.current = true

    const code = searchParams.get("code")
    const state = searchParams.get("state") // "google" or "microsoft"

    if (!code || !state) {
      warningToast("OAuth callback missing code or state")
      navigate("/", { replace: true })
      return
    }

    const endpointMap: Record<string, string> = {
      google: "accounts/google/",
      microsoft: "accounts/microsoft/",
    }

    const endpoint = endpointMap[state]
    if (!endpoint) {
      warningToast(`Unknown OAuth provider: ${state}`)
      navigate("/", { replace: true })
      return
    }

    const exchangeCode = async () => {
      try {
        const res = await connect.post(endpoint, {
          code,
        })

        // dj-rest-auth returns access & refresh tokens
        localStorage.setItem("accessToken", res.data.access)
        localStorage.setItem("refreshToken", res.data.refresh)

        // Fetch user profile & update context
        if (res.data.user) {
          setLogin(res.data.user)
        } else {
          const userRes = await connect.get("accounts/me/")
          setLogin(userRes.data)
        }

        navigate("/", { replace: true })
      } catch (error) {
        errorToast(error, "OAuth login failed")
        navigate("/", { replace: true })
      }
    }

    exchangeCode()
  }, [searchParams, navigate, setLogin])

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontSize: "1.1rem",
      color: "#888",
    }}>
      Signing you in…
    </div>
  )
}

export default OAuthCallback
