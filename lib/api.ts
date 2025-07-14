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
  _refreshAccessToken: () => Promise<void>, // keep signature for compatibility
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

  // If token expired, do NOT try to refresh, just throw
  if (response.status === 401) {
    throw new Error("Authentication failed")
  }

  return response
}

export async function fetchFiles(accessToken: string): Promise<FileItem[]> {
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
    async () => {}, // No refresh needed
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function uploadFile(
  file: File,
  accessToken: string,
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
    async () => {}, // No refresh needed
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function deleteFile(
  fileId: number,
  accessToken: string,
): Promise<void> {
  const host = getApiHost()

  const response = await makeAuthenticatedRequest(
    `${host}/api/files/${fileId}/`,
    {
      method: "DELETE",
    },
    accessToken,
    async () => {}, // No refresh needed
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

export async function getFileInfo(
  fileId: number,
  accessToken: string,
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
    async () => {}, // No refresh needed
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}
