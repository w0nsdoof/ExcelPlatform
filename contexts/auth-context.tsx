"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { login, refreshToken, getUserProfile, type LoginRequest, type UserProfile } from "@/lib/auth-api"

interface AuthContextType {
  user: UserProfile | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"
const USER_KEY = "user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!accessToken

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken)
      setRefreshTokenValue(storedRefreshToken)
      setUser(JSON.parse(storedUser))
    }

    setIsLoading(false)
  }, [])

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      const response = await login(credentials)

      // Store tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access)
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh)

      setAccessToken(response.access)
      setRefreshTokenValue(response.refresh)

      // Fetch user profile
      const userProfile = await getUserProfile(response.access)
      localStorage.setItem(USER_KEY, JSON.stringify(userProfile))
      setUser(userProfile)
    } catch (error) {
      // Clear any existing tokens on login failure
      handleLogout()
      throw error
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    setAccessToken(null)
    setRefreshTokenValue(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
