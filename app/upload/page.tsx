"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { uploadFile } from "@/lib/api"
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"

export default function UploadPage() {
  const { t } = useLanguage()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { accessToken } = useAuth()

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setUploadStatus({
        type: "error",
        message: "File size exceeds 100MB limit",
      })
      return
    }

    try {
      setUploading(true)
      setUploadStatus({ type: null, message: "" })
      setUploadedFileName(null)

      await uploadFile(file, accessToken!)

      setUploadStatus({
        type: "success",
        message: t("uploadSuccess"),
      })
      setUploadedFileName(file.name)

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("401")) {
        setUploadStatus({
          type: "error",
          message: t("uploadError401"),
        })
        setUploadedFileName(null)
      } else {
        setUploadStatus({
          type: "error",
          message: t("uploadErrorGeneric"),
        })
        setUploadedFileName(null)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleSelectClick = () => {
    fileInputRef.current?.click()
  }

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

          <div className="text-center mb-8">
            <Image
              src="/images/kbtu-logo.png"
              alt="KBTU Logo"
              width={250}
              height={125}
              className="mx-auto object-contain mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900">{t("uploadFiles")}</h1>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {t("uploadFiles")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                } ${uploading ? "pointer-events-none opacity-50" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleSelectClick}
                style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
                tabIndex={0}
                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) handleSelectClick(); }}
                role="button"
                aria-label={t("selectFiles")}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <p className="text-lg font-medium">{t("uploading")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-medium mb-2">{t("dragDropText")}</p>
                      <p className="text-sm text-gray-500 mb-4">{t("maxFileSize")}</p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploading}
              />

              {uploadStatus.type && (
                <div
                  className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
                    uploadStatus.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {uploadStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span>{uploadStatus.message}</span>
                  {uploadStatus.type === "success" && uploadedFileName && (
                    <span className="ml-2 font-semibold">{uploadedFileName}</span>
                  )}
                </div>
              )}

              {uploadStatus.type === "success" && (
                <div className="mt-4 text-center">
                  <Link href="/files">
                    <Button variant="outline">{t("filesList")}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
