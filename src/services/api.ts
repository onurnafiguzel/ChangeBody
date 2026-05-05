/// <reference types="vite/client" />
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
          localStorage.setItem('accessToken', data.accessToken)
          const expiryTime = Date.now() + data.expiresIn * 1000
          localStorage.setItem('tokenExpiry', expiryTime.toString())
          original!.headers!['Authorization'] = `Bearer ${data.accessToken}`
          return api(original!)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
