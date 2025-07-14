export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  refresh: string
  access: string
}

export interface RefreshRequest {
  refresh: string
}

export interface RefreshResponse {
  access: string
}

export interface UserProfile {
  id: number
  username: string
  email?: string
  is_staff?: boolean
  // Add other profile fields as needed
}

const getApiHost = () => {
  return process.env.NEXT_PUBLIC_API_HOST || "http://127.0.0.1:8000"
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const host = getApiHost()

  const response = await fetch(`${host}/users/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  return response.json()
}

export async function refreshToken(refreshToken: string): Promise<RefreshResponse> {
  const host = getApiHost()

  const response = await fetch(`${host}/users/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  return response.json()
}

export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const host = getApiHost()

  const response = await fetch(`${host}/users/profile/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Profile fetch failed: ${response.status}`)
  }

  return response.json()
}
