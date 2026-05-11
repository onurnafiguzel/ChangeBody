import api from './api'
import type { CreateWorkoutSessionRequest, WorkoutSessionDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export async function createWorkoutSession(payload: CreateWorkoutSessionRequest): Promise<string> {
  // BE response: oluşturulan session'ın UUID'si (raw string)
  const { data } = await api.post<string>(API_ENDPOINTS.WORKOUT_SESSIONS_CREATE, payload)
  return data
}

export async function getUserWorkoutSessionsByDay(
  userId: string,
  dayKey: string,
  count: number = 4,
): Promise<WorkoutSessionDto[]> {
  const params = new URLSearchParams({
    dayKey,
    count: String(Math.min(Math.max(count, 1), 50)),
  })
  const { data } = await api.get<WorkoutSessionDto[]>(
    `${API_ENDPOINTS.USER_WORKOUT_SESSIONS(userId)}?${params.toString()}`,
  )
  return data
}
