"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { fetchFiles, deleteFile, type FileItem } from "@/lib/api"
import { formatFileSize, formatDate } from "@/lib/utils"
import { ArrowLeft, Download, FileText, Loader2, Trash2, Users, GraduationCap } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"

interface ReportData {
  quota_counts: Record<string, number>
  specialization_counts: Record<string, number>
  notes_counts: Record<string, number>
  metadata?: {
    total_rows_processed: number
    rows_with_quotas: number
    rows_with_specializations: number
    processing_duration_seconds: number
  }
}

export default function FilesPage() {
  const { t, language } = useLanguage()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [sortOrder, setSortOrder] = useState<'name' | 'count'>('count')

  const { accessToken, refreshAccessToken } = useAuth()

  // Helper function to sort entries
  const sortEntries = (entries: [string, number][]) => {
    return entries.sort((a, b) => {
      if (sortOrder === 'count') {
        return b[1] - a[1] // Sort by count descending
      } else {
        return a[0].localeCompare(b[0]) // Sort by name ascending
      }
    })
  }

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)

      const filesData = await fetchFiles(accessToken!, refreshAccessToken)
      setFiles(filesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return; // Don't fetch if not authenticated
    loadFiles();
  }, [accessToken]);

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`${t("confirmDelete")}\n${fileName}`)) {
      return
    }

    try {
      setDeletingId(fileId)

      await deleteFile(fileId, accessToken!, refreshAccessToken)

      // Remove file from local state
      setFiles(files.filter((file) => file.id !== fileId))
    } catch (err) {
      alert(t("deleteError"))
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewReport = async (reportUrl: string) => {
    if (!reportUrl) return
    setIsReportModalOpen(true)
    setLoadingReport(true)
    setReportData(null)

    try {
      const response = await fetch(reportUrl)
      if (response.ok) {
        const data = await response.json()
        console.log('Report data:', data) // Debug log
        
        if (data && (data.quota_counts || data.specialization_counts)) {
          // Ensure quota_counts is a flat object with string keys and number values
          const quotaCounts: Record<string, number> = {}
          const notesCounts: Record<string, number> = {}
          
          if (data.quota_counts && typeof data.quota_counts === 'object') {
            Object.entries(data.quota_counts).forEach(([key, value]) => {
              if (typeof key === 'string') {
                if (typeof value === 'number') {
                  quotaCounts[key] = value
                } else if (typeof value === 'object' && value !== null) {
                  // Handle nested quota categories like "Примечание"
                  Object.entries(value).forEach(([subKey, subValue]) => {
                    if (typeof subKey === 'string' && typeof subValue === 'number') {
                      notesCounts[subKey] = subValue
                    }
                  })
                }
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
            notes_counts: notesCounts,
            metadata: data.metadata
          })
        } else {
          setReportData(null)
        }
      } else {
        setReportData(null)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
      setReportData(null)
    } finally {
      setLoadingReport(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900">{t("filesList")}</h1>
          </div>

          <Card className="max-w-6xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("filesList")}
              </CardTitle>
              <Link href="/upload">
                <Button className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("uploadFiles")}
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>{t("loading")}</span>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{t("error")}</p>
                  <Button onClick={loadFiles} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}

              {!loading && !error && files.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{t("noFiles")}</p>
                  <Link href="/upload">
                    <Button>{t("uploadFiles")}</Button>
                  </Link>
                </div>
              )}

              {!loading && !error && files.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("fileName")}</TableHead>
                        <TableHead>{t("fileSize")}</TableHead>
                        <TableHead>{t("uploadDate")}</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="truncate max-w-xs" title={file.file_name}>
                                {file.file_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatFileSize(file.file_size, language)}</TableCell>
                          <TableCell>{formatDate(file.uploaded_at, language)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {file.report_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1"
                                  onClick={() => handleViewReport(file.report_url!)}
                                >
                                  <FileText className="w-4 h-4" />
                                  {t("viewReport")}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(file.file, file.file_name)}
                                className="flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" />
                                {t("download")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(file.id, file.file_name)}
                                disabled={deletingId === file.id}
                                className="flex items-center gap-1"
                              >
                                {deletingId === file.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                {t("delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("viewReport")}</DialogTitle>
            </DialogHeader>
            {loadingReport ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>{t("loading")}</span>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Metadata Summary */}
                {reportData.metadata && (
                  <div className="bg-gray-50 p-4 rounded-lg">
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

                                {/* Sorting Controls */}
                <div className="flex justify-end mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t("sortByCount")}:</span>
                    <Button
                      variant={sortOrder === 'count' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortOrder('count')}
                    >
                      {t("sortByCount")}
                    </Button>
                    <Button
                      variant={sortOrder === 'name' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortOrder('name')}
                    >
                      {t("sortByName")}
                    </Button>
                  </div>
                </div>

                {/* Tabs for Quota, Specialization, and Notes Counts */}
                <Tabs defaultValue="quotas" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="quotas" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {t("quotaCategories")}
                    </TabsTrigger>
                    <TabsTrigger value="specializations" className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      {t("specializations")}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {t("notes")}
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
                            {sortEntries(Object.entries(reportData.quota_counts)).map(([quota, count]) => (
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
                            {sortEntries(Object.entries(reportData.specialization_counts)).map(([spec, count]) => (
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

                  <TabsContent value="notes" className="mt-4">
                    {Object.keys(reportData.notes_counts).length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("noteCategory")}</TableHead>
                              <TableHead className="text-right">{t("count")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortEntries(Object.entries(reportData.notes_counts)).map(([note, count]) => (
                              <TableRow key={String(note)}>
                                <TableCell className="font-medium">{String(note)}</TableCell>
                                <TableCell className="text-right">{Number(count)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {t("noNotesData")}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-8">
                <p>{t("error")}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
