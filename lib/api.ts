export interface FileItem {
  id: number
  file: string
  uploaded_at: string
  file_name: string
  file_size: number
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
      throw new Error("Authentication failed")
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

  if (!response.ok) {
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
