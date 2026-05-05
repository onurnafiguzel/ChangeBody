import api from './api'
import type { PackageDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

interface PackageListResponse {
  data: PackageDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getPackages(page = 1, pageSize = 10): Promise<PackageDto[]> {
  const { data } = await api.get<PackageListResponse>(
    `${API_ENDPOINTS.PACKAGES_LIST}?isActiveOnly=true&page=${page}&pageSize=${pageSize}`
  )
  return data.data
}
