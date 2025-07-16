"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { uploadFile } from "@/lib/api"
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle, Users, GraduationCap } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"

interface ReportData {
  quota_counts: Record<string, number>
  specialization_counts: Record<string, number>
  metadata?: {
    total_rows_processed: number
    rows_with_quotas: number
    rows_with_specializations: number
    processing_duration_seconds: number
  }
}

export default function UploadPage() {
  const { t } = useLanguage()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { accessToken, refreshAccessToken } = useAuth()

  useEffect(() => {
    const fetchReport = async () => {
      if (uploadedFileInfo?.report_url) {
        try {
          const res = await fetch(uploadedFileInfo.report_url)
          if (res.ok) {
            const data = await res.json()
            console.log('Report data:', data) // Debug log
            
            if (data && (data.quota_counts || data.specialization_counts)) {
              // Ensure quota_counts is a flat object with string keys and number values
              const quotaCounts: Record<string, number> = {}
              if (data.quota_counts && typeof data.quota_counts === 'object') {
                Object.entries(data.quota_counts).forEach(([key, value]) => {
                  if (typeof key === 'string' && typeof value === 'number') {
                    quotaCounts[key] = value
                  }
                })
              }
              
              // Ensure specialization_counts is a flat object with string keys and number values
              const specializationCounts: Record<string, number> = {}
              if (data.specialization_counts && typeof data.specialization_counts === 'object') {
                Object.entries(data.specialization_counts).forEach(([key, value]) => {
                  if (typeof key === 'string' && typeof value === 'number') {
                    specializationCounts[key] = value
                  }
                })
              }
              
              setReportData({
                quota_counts: quotaCounts,
                specialization_counts: specializationCounts,
                metadata: data.metadata
              })
            }
          }
        } catch (e) {
          console.error('Error fetching report:', e)
        }
      }
    }
    fetchReport()
  }, [uploadedFileInfo])

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
      setUploadedFileInfo(null)

      const response = await uploadFile(file, accessToken!, refreshAccessToken)
      setUploadedFileInfo(response)

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
        setUploadedFileInfo(null)
      } else {
        setUploadStatus({
          type: "error",
          message: t("uploadErrorGeneric"),
        })
        setUploadedFileName(null)
        setUploadedFileInfo(null)
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
          {reportData ? (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8 mt-12">
                             <div className="text-center mb-8">
                 <Image
                   src="/images/kbtu-logo.png"
                   alt="KBTU Logo"
                   width={200}
                   height={100}
                   className="mx-auto object-contain mb-4"
                 />
                 <h2 className="text-2xl font-bold mb-2">{t("uploadReport")}</h2>
                 <p className="text-gray-600">File: {uploadedFileName}</p>
               </div>

               {/* Metadata Summary */}
               {reportData.metadata && (
                 <div className="bg-gray-50 p-4 rounded-lg mb-6">
                   <h3 className="font-semibold mb-2">{t("processingSummary")}</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                     <div>
                       <span className="text-gray-600">{t("totalRows")}:</span>
                       <div className="font-medium">{reportData.metadata.total_rows_processed}</div>
                     </div>
                     <div>
                       <span className="text-gray-600">{t("withQuotas")}:</span>
                       <div className="font-medium">{reportData.metadata.rows_with_quotas}</div>
                     </div>
                     <div>
                       <span className="text-gray-600">{t("withSpecializations")}:</span>
                       <div className="font-medium">{reportData.metadata.rows_with_specializations}</div>
                     </div>
                     <div>
                       <span className="text-gray-600">{t("processingTime")}:</span>
                       <div className="font-medium">{reportData.metadata.processing_duration_seconds.toFixed(3)}s</div>
                     </div>
                   </div>
                 </div>
               )}

               {/* Tabs for Quota and Specialization Counts */}
               <Tabs defaultValue="quotas" className="w-full">
                 <TabsList className="grid w-full grid-cols-2">
                   <TabsTrigger value="quotas" className="flex items-center gap-2">
                     <Users className="w-4 h-4" />
                     {t("quotaCategories")}
                   </TabsTrigger>
                   <TabsTrigger value="specializations" className="flex items-center gap-2">
                     <GraduationCap className="w-4 h-4" />
                     {t("specializations")}
                   </TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="quotas" className="mt-4">
                   {Object.keys(reportData.quota_counts).length > 0 ? (
                     <div className="overflow-x-auto">
                       <Table>
                         <TableHeader>
                           <TableRow>
                             <TableHead>{t("quotaCategory")}</TableHead>
                             <TableHead className="text-right">{t("count")}</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {Object.entries(reportData.quota_counts).map(([quota, count]) => (
                             <TableRow key={String(quota)}>
                               <TableCell className="font-medium">{String(quota)}</TableCell>
                               <TableCell className="text-right">{Number(count)}</TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                   ) : (
                     <div className="text-center py-8 text-gray-500">
                       {t("noQuotaData")}
                     </div>
                   )}
                 </TabsContent>
                 
                 <TabsContent value="specializations" className="mt-4">
                   {Object.keys(reportData.specialization_counts).length > 0 ? (
                     <div className="overflow-x-auto">
                       <Table>
                         <TableHeader>
                           <TableRow>
                             <TableHead>{t("specialization")}</TableHead>
                             <TableHead className="text-right">{t("count")}</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {Object.entries(reportData.specialization_counts).map(([spec, count]) => (
                             <TableRow key={String(spec)}>
                               <TableCell className="font-medium">{String(spec)}</TableCell>
                               <TableCell className="text-right">{Number(count)}</TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                   ) : (
                     <div className="text-center py-8 text-gray-500">
                       {t("noSpecializationData")}
                     </div>
                   )}
                 </TabsContent>
               </Tabs>

               <div className="mt-6 text-center space-x-4">
                 <Link href="/upload">
                   <Button variant="outline">{t("uploadAnotherFile")}</Button>
                 </Link>
                 <Link href="/files">
                   <Button>{t("viewAllFiles")}</Button>
                 </Link>
               </div>
            </div>
          ) : (
            <>
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

                  {uploadStatus.type === "success" && uploadedFileInfo?.report_url && (
                    <div className="mt-4 text-center">
                      <a
                        href={uploadedFileInfo.report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {t("viewReport")}
                      </a>
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
