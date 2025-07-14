"use client"

import { Button } from "@/components/ui/button"
import { useLanguage, type Language } from "@/contexts/language-context"

const languages: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "kz", label: "KZ" },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex gap-1">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={language === lang.code ? "default" : "ghost"}
          size="sm"
          onClick={() => setLanguage(lang.code)}
          className="text-xs px-2 py-1 h-7"
        >
          {lang.label}
        </Button>
      ))}
    </div>
  )
}
