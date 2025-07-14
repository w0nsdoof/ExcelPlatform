import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number, language: "en" | "ru" | "kz" = "en"): string {
  const units = {
    en: ["bytes", "KB", "MB", "GB"],
    ru: ["байт", "КБ", "МБ", "ГБ"],
    kz: ["байт", "КБ", "МБ", "ГБ"],
  }

  if (bytes === 0) return `0 ${units[language][0]}`

  const k = 1024
  const sizes = units[language]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(dateString: string, language: "en" | "ru" | "kz" = "en"): string {
  const date = new Date(dateString)

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }

  const locales = {
    en: "en-US",
    ru: "ru-RU",
    kz: "kk-KZ",
  }

  return date.toLocaleDateString(locales[language], options)
}
