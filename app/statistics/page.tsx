"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { fetchSummary, type SummaryData } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, BarChart3, FileText, Users, GraduationCap, Clock, Calendar, RefreshCw, Loader2 } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"

export default function StatisticsPage() {
  const { t, language } = useLanguage()
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<number>(1)
  const [userOnly, setUserOnly] = useState<boolean>(true)
  const [sortOrder, setSortOrder] = useState<'name' | 'count'>('count')

  const { accessToken, refreshAccessToken } = useAuth()

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchSummary(accessToken!, refreshAccessToken, timeRange, userOnly)
      setSummaryData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    loadSummary()
  }, [accessToken, timeRange, userOnly])

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

  // Process quota counts to separate regular quotas from notes
  const processQuotaCounts = (quotaCounts: Record<string, number | Record<string, number>>) => {
    const regularQuotas: Record<string, number> = {}
    const notesCounts: Record<string, number> = {}

    Object.entries(quotaCounts).forEach(([key, value]) => {
      if (typeof value === 'number') {
        regularQuotas[key] = value
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested quota categories like "Примечание"
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (typeof subValue === 'number') {
            notesCounts[subKey] = subValue
          }
        })
      }
    })

    return { regularQuotas, notesCounts }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 1) {
      return `${(seconds * 1000).toFixed(1)}ms`
    }
    return `${seconds.toFixed(3)}s`
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
            <h1 className="text-3xl font-bold text-gray-900">{t("statisticsOverview")}</h1>
          </div>

          {/* Filters */}
          <Card className="max-w-6xl mx-auto mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t("timeRange")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("timeRange")}:</span>
                  <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("lastDay")}</SelectItem>
                      <SelectItem value="7">{t("lastWeek")}</SelectItem>
                      <SelectItem value="30">{t("lastMonth")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("filesIncluded")}:</span>
                  <Select value={userOnly.toString()} onValueChange={(value) => setUserOnly(value === 'true')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("myFilesOnly")}</SelectItem>
                      <SelectItem value="false">{t("allUsersFiles")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={loadSummary} disabled={loading} className="flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {t("refreshData")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span className="text-lg">{t("loading")}</span>
            </div>
          )}

          {error && (
            <Card className="max-w-6xl mx-auto mb-6">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={loadSummary} variant="outline">
                    {t("refreshData")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && summaryData && (
            <>
              {/* Overall Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("totalFiles")}</p>
                        <p className="text-2xl font-bold">{summaryData.summary.total_files}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("averageProcessingTime")}</p>
                        <p className="text-2xl font-bold">
                          {formatDuration(summaryData.summary.processing_stats.average_processing_time_seconds)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("filesIncluded")}</p>
                        <p className="text-2xl font-bold">{summaryData.metadata.files_included}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("generatedAt")}</p>
                        <p className="text-sm font-medium">
                          {formatDate(summaryData.metadata.generated_at, language)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Date Range Info */}
              <Card className="max-w-6xl mx-auto mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">{t("dateRange")}</p>
                      <p className="font-medium">
                        {formatDate(summaryData.metadata.date_range.start, language)} - {formatDate(summaryData.metadata.date_range.end, language)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("timeRange")}</p>
                      <p className="font-medium">
                        {summaryData.metadata.time_range_days === 1 && t("lastDay")}
                        {summaryData.metadata.time_range_days === 7 && t("lastWeek")}
                        {summaryData.metadata.time_range_days === 30 && t("lastMonth")}
                        {![1, 7, 30].includes(summaryData.metadata.time_range_days) && `${summaryData.metadata.time_range_days} ${t("timeRange").toLowerCase()}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("filesWithProcessingData")}</p>
                      <p className="font-medium">{summaryData.summary.processing_stats.files_with_processing_data}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

              {/* Detailed Statistics Tabs */}
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t("summaryStats")}
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t("timelineStats")}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("activityStats")}
                  </TabsTrigger>
                  <TabsTrigger value="processing" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("processingStats")}
                  </TabsTrigger>
                </TabsList>

                {/* Summary Statistics Tab */}
                <TabsContent value="summary" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quota Categories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          {t("quotaCategories")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const { regularQuotas } = processQuotaCounts(summaryData.summary.total_quota_counts)
                          const entries = Object.entries(regularQuotas)
                          return entries.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t("quotaCategory")}</TableHead>
                                    <TableHead className="text-right">{t("count")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortEntries(entries).map(([quota, count]) => (
                                    <TableRow key={quota}>
                                      <TableCell className="font-medium">{quota}</TableCell>
                                      <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              {t("noQuotaData")}
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>

                    {/* Specializations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          {t("specializations")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const entries = Object.entries(summaryData.summary.total_specialization_counts)
                          return entries.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t("specialization")}</TableHead>
                                    <TableHead className="text-right">{t("count")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortEntries(entries).map(([spec, count]) => (
                                    <TableRow key={spec}>
                                      <TableCell className="font-medium">{spec}</TableCell>
                                      <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              {t("noSpecializationData")}
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          {t("notes")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const { notesCounts } = processQuotaCounts(summaryData.summary.total_quota_counts)
                          const entries = Object.entries(notesCounts)
                          return entries.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t("noteCategory")}</TableHead>
                                    <TableHead className="text-right">{t("count")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortEntries(entries).map(([note, count]) => (
                                    <TableRow key={note}>
                                      <TableCell className="font-medium">{note}</TableCell>
                                      <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              {t("noNotesData")}
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Timeline Statistics Tab */}
                <TabsContent value="timeline" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {t("uploadTimeline")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summaryData.summary.file_upload_timeline.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("fileId")}</TableHead>
                                <TableHead>{t("fileName")}</TableHead>
                                <TableHead>{t("uploadDate")}</TableHead>
                                <TableHead className="text-right">{t("quotaCount")}</TableHead>
                                <TableHead className="text-right">{t("specializationCount")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summaryData.summary.file_upload_timeline.map((file) => (
                                <TableRow key={file.file_id}>
                                  <TableCell className="font-medium">{file.file_id}</TableCell>
                                  <TableCell>{file.file_name}</TableCell>
                                  <TableCell>{formatDate(file.uploaded_at, language)}</TableCell>
                                  <TableCell className="text-right">{file.quota_count}</TableCell>
                                  <TableCell className="text-right">{file.specialization_count}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {t("noDataAvailable")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity Statistics Tab */}
                <TabsContent value="activity" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {t("mostActiveDays")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summaryData.summary.most_active_days.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead className="text-right">{t("uploads")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summaryData.summary.most_active_days.map((day) => (
                                <TableRow key={day.date}>
                                  <TableCell className="font-medium">{formatDate(day.date, language)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="secondary">{day.uploads}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {t("noDataAvailable")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Processing Statistics Tab */}
                <TabsContent value="processing" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          {t("processingStatistics")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t("averageProcessingTime")}:</span>
                            <span className="font-medium">
                              {formatDuration(summaryData.summary.processing_stats.average_processing_time_seconds)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t("totalProcessingTime")}:</span>
                            <span className="font-medium">
                              {formatDuration(summaryData.summary.processing_stats.total_processing_time_seconds)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t("filesWithProcessingData")}:</span>
                            <span className="font-medium">
                              {summaryData.summary.processing_stats.files_with_processing_data}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          {t("overallStats")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t("totalFiles")}:</span>
                            <span className="font-medium">{summaryData.summary.total_files}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t("filesIncluded")}:</span>
                            <span className="font-medium">{summaryData.metadata.files_included}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t("timeRange")}:</span>
                            <span className="font-medium">{summaryData.metadata.time_range_days} days</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          {!loading && !error && !summaryData && (
            <Card className="max-w-6xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{t("noDataAvailable")}</p>
                  <Button onClick={loadSummary} variant="outline">
                    {t("refreshData")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
