"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const { t } = useLanguage()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/main")
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    try {
      await login({ username, password })
      router.push("/main")
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        setError(t("loginError401"))
      } else {
        setError(t("loginErrorGeneric"))
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Image
            src="/images/kbtu-logo.png"
            alt="KBTU Logo"
            width={300}
            height={150}
            className="mx-auto object-contain"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder={t("enterUsername")}
              className="w-full h-12 text-base"
              disabled={loading}
              required
            />
          </div>

          <div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t("enterPassword")}
              className="w-full h-12 text-base"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("loading")}
              </>
            ) : (
              t("proceed")
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
