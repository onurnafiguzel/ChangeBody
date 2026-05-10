import api from './api'
import type { UserAssignmentDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function getWaitingUsers(): Promise<UserAssignmentDto[]> {
  const { data } = await api.get<UserAssignmentDto[]>(API_ENDPOINTS.WAITING_USERS_LIST)
  return data
}
