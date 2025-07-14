"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Upload, FileText, BarChart3 } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { UserMenu } from "@/components/user-menu"

export default function MainPage() {
  const { t } = useLanguage()

  const navigationItems = [
    {
      title: t("uploadFiles"),
      description: t("uploadDescription"),
      href: "/upload",
      icon: Upload,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: t("filesList"),
      description: t("filesDescription"),
      href: "/files",
      icon: FileText,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: t("statistics"),
      description: t("statisticsDescription"),
      href: "/statistics",
      icon: BarChart3,
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <UserMenu />
          <LanguageSwitcher />
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <Image
              src="/images/kbtu-logo.png"
              alt="KBTU Logo"
              width={350}
              height={175}
              className="mx-auto object-contain mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("welcome")}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {navigationItems.map((item) => {
              const IconComponent = item.icon
              return (
                <div key={item.href} className="flex flex-col items-center">
                  <Link href={item.href}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader className="text-center pb-4">
                        <div
                          className={`w-16 h-16 rounded-full ${item.color} flex items-center justify-center mx-auto mb-4`}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <CardDescription className="text-base">{item.description}</CardDescription>
                        <Button className={`mt-4 w-full ${item.color} text-white`}>{item.title}</Button>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
