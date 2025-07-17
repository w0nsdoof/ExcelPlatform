export interface FileItem {
  id: number
  file: string
  uploaded_at: string
  file_name: string
  file_size: number
  report_url?: string | null
}

export interface SummaryData {
  summary: {
    total_files: number
    total_quota_counts: Record<string, number | Record<string, number>>
    total_specialization_counts: Record<string, number>
    processing_stats: {
      average_processing_time_seconds: number
      total_processing_time_seconds: number
      files_with_processing_data: number
    }
    file_upload_timeline: Array<{
      file_id: number
      file_name: string
      uploaded_at: string
      quota_count: number
      specialization_count: number
    }>
    most_active_days: Array<{
      date: string
      uploads: number
    }>
  }
  metadata: {
    generated_at: string
    time_range_days: number
    files_included: number
    date_range: {
      start: string
      end: string
    }
  }
}

const getApiHost = () => {
  return process.env.NEXT_PUBLIC_API_HOST || "http://127.0.0.1:8000"
}

// Helper function to make authenticated requests with auto-refresh
async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit,
  accessToken: string,
  refreshAccessToken: () => Promise<void>,
): Promise<Response> {
  const makeRequest = async (token: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }

  let response = await makeRequest(accessToken)

  // Only handle 401 errors for token refresh, let other status codes pass through
  if (response.status === 401) {
    // Try to parse the error response for token_not_valid and Token is expired
    let shouldTryRefresh = false
    try {
      const data = await response.clone().json()
      if (
        data?.code === "token_not_valid" &&
        Array.isArray(data?.messages) &&
        data.messages.some(
          (msg: any) =>
            msg.token_class === "AccessToken" &&
            msg.token_type === "access" &&
            msg.message && msg.message.toLowerCase().includes("expired")
        )
      ) {
        shouldTryRefresh = true
      }
    } catch (e) {
      // If parsing fails, do not try refresh
    }

    if (shouldTryRefresh) {
      try {
        await refreshAccessToken()
        const newToken = localStorage.getItem("access_token")
        if (newToken) {
          response = await makeRequest(newToken)
          // If still 401 after refresh, throw error
          if (response.status === 401) {
            throw new Error("Authentication failed after refresh")
          }
        } else {
          throw new Error("No new access token after refresh")
        }
      } catch (error) {
        throw new Error("Authentication failed")
      }
    } else {
      // If no refresh needed, throw 401 error
      throw new Error("HTTP error! status: 401")
    }
  }

  return response
}

export async function fetchFiles(
  accessToken: string,
  refreshAccessToken: () => Promise<void>
): Promise<FileItem[]> {
  const host = getApiHost()

  const response = await makeAuthenticatedRequest(
    `${host}/api/files/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    accessToken,
    refreshAccessToken
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function uploadFile(
  file: File,
  accessToken: string,
  refreshAccessToken: () => Promise<void>
): Promise<FileItem> {
  const host = getApiHost()

  const formData = new FormData()
  formData.append("file", file)

  const response = await makeAuthenticatedRequest(
    `${host}/api/files/`,
    {
      method: "POST",
      body: formData,
    },
    accessToken,
    refreshAccessToken
  )

  console.log('Upload response status:', response.status) // Debug log

  if (!response.ok) {
    console.log('Response not ok, status:', response.status) // Debug log
    
    // Handle specific 400 error for duplicate files
    if (response.status === 400) {
      let errorData
      try {
        errorData = await response.json()
        console.log('400 error data:', errorData) // Debug log
      } catch (parseError) {
        console.log('Error parsing 400 response:', parseError) // Debug log
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      if (errorData.error && errorData.error.includes("already been processed recently")) {
        console.log('Detected duplicate file error') // Debug log
        throw new Error("DUPLICATE_FILE")
      } else {
        console.log('400 error but not duplicate file') // Debug log
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }
    }
    
    // Handle 401 errors specifically
    if (response.status === 401) {
      throw new Error("HTTP error! status: 401")
    }
    
    // Generic error for other status codes
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function deleteFile(
  fileId: number,
  accessToken: string,
  refreshAccessToken: () => Promise<void>
): Promise<void> {
  const host = getApiHost()

  const response = await makeAuthenticatedRequest(
    `${host}/api/files/${fileId}/`,
    {
      method: "DELETE",
    },
    accessToken,
    refreshAccessToken
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

export async function getFileInfo(
  fileId: number,
  accessToken: string,
  refreshAccessToken: () => Promise<void>
): Promise<FileItem> {
  const host = getApiHost()

  const response = await makeAuthenticatedRequest(
    `${host}/api/files/${fileId}/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    accessToken,
    refreshAccessToken
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function fetchSummary(
  accessToken: string,
  refreshAccessToken: () => Promise<void>,
  days?: number,
  userOnly?: boolean
): Promise<SummaryData> {
  const host = getApiHost()
  
  const params = new URLSearchParams()
  if (days !== undefined) {
    params.append('days', days.toString())
  }
  if (userOnly !== undefined) {
    params.append('user_only', userOnly.toString())
  }
  
  const url = `${host}/api/files/summary/${params.toString() ? `?${params.toString()}` : ''}`

  const response = await makeAuthenticatedRequest(
    url,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    accessToken,
    refreshAccessToken
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}
