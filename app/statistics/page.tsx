"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ArrowLeft } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { UserMenu } from "@/components/user-menu"

export default function StatisticsPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <UserMenu />
          <LanguageSwitcher />
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <Link href="/main">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>

          <div className="text-center mb-12">
            <Image
              src="/images/kbtu-logo.png"
              alt="KBTU Logo"
              width={250}
              height={125}
              className="mx-auto object-contain mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900">{t("statistics")}</h1>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
