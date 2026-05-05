import api from './api'
import type { AuthTokenResponse, LoginRequest, SignupRequest } from '../types/auth'

function storeSession(data: AuthTokenResponse) {
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('userId', data.userId)
  localStorage.setItem('role', data.role)
  localStorage.setItem('email', data.email)
  localStorage.setItem('tokenExpiry', (Date.now() + data.expiresIn * 1000).toString())
}

export async function login(payload: LoginRequest): Promise<AuthTokenResponse> {
  const { data } = await api.post<AuthTokenResponse>('/api/auth/login', payload)
  storeSession(data)
  return data
}

export async function signup(payload: SignupRequest): Promise<AuthTokenResponse> {
  const { data } = await api.post<AuthTokenResponse>('/api/auth/signup', payload)
  storeSession(data)
  return data
}

export function logout() {
  localStorage.clear()
  window.location.href = '/login'
}

export function getStoredUser() {
  const accessToken = localStorage.getItem('accessToken')
  const tokenExpiry = localStorage.getItem('tokenExpiry')
  if (!accessToken || !tokenExpiry) return null
  if (Date.now() > parseInt(tokenExpiry)) return null

  return {
    userId: localStorage.getItem('userId')!,
    email: localStorage.getItem('email')!,
    role: localStorage.getItem('role') as 'User' | 'Coach' | 'Admin',
  }
}
