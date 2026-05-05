export type UserRole = 'User' | 'Coach' | 'Admin'

export interface AuthTokenResponse {
  userId: string
  email: string
  role: UserRole
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
}

export interface ApiError {
  type: string
  title: string
  status: number
  detail: string
  instance?: string
  errors?: Record<string, string[]>
}
